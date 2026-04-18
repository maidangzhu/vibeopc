import { Sandbox } from '@vercel/sandbox';
import { prisma } from '@/lib/db';
import { sendPackageReadyEmail } from '@/lib/email';

type FetchLike = typeof fetch;

export const PACKAGE_CHECK_INTERVAL_MS = 60_000;
export const PACKAGE_CHECK_MAX_ATTEMPTS = 10;
export const PACKAGE_CHECK_SCRIPT_PATH = '/vercel/sandbox/check-package.mjs';

export interface PackageAvailabilityResult {
  ready: boolean;
  versionFound: boolean;
  tarballReachable: boolean;
  resolvedVersion: string | null;
  tarballUrl: string | null;
  error: string | null;
}

export interface SandboxAttemptUpdate {
  attempt: number;
  sandboxId: string;
  result: PackageAvailabilityResult;
}

export interface SandboxMonitorResult {
  status: 'ready' | 'timeout';
  attempts: number;
  sandboxId: string;
  lastError: string;
  lastResult: PackageAvailabilityResult;
}

export type PackageCheckJobStatus =
  | 'pending'
  | 'checking'
  | 'ready'
  | 'timeout'
  | 'failed';

interface CommandResultLike {
  exitCode: number | null;
  stdout: () => Promise<string>;
  stderr: () => Promise<string>;
}

interface SandboxLike {
  sandboxId: string;
  writeFiles: (files: Array<{ path: string; content: string }>) => Promise<void>;
  runCommand: (params: {
    cmd: string;
    args?: string[];
    cwd?: string;
  }) => Promise<CommandResultLike>;
  stop: (opts?: { blocking?: boolean }) => Promise<unknown>;
}

type SandboxFactory = (params: {
  runtime: string;
  timeout: number;
}) => Promise<SandboxLike>;

async function cleanupSandbox(sandbox: SandboxLike, context: string): Promise<void> {
  try {
    await sandbox.stop({ blocking: true });
  } catch (error) {
    console.error(`${context} sandbox cleanup failed:`, error);
  }
}

function getRegistryUrl(packageName: string): string {
  return `https://registry.npmjs.org/${packageName.replace(/\//g, '%2f')}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function fetchTarball(fetchImpl: FetchLike, tarballUrl: string): Promise<boolean> {
  const headResponse = await fetchImpl(tarballUrl, { method: 'HEAD' });
  if (headResponse.ok) return true;

  if (headResponse.status !== 405 && headResponse.status !== 501) {
    return false;
  }

  const fallbackResponse = await fetchImpl(tarballUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
  });

  return fallbackResponse.ok;
}

export async function checkPackageAvailability(
  packageName: string,
  expectedVersion: string,
  fetchImpl: FetchLike = fetch
): Promise<PackageAvailabilityResult> {
  try {
    const registryResponse = await fetchImpl(getRegistryUrl(packageName));
    if (!registryResponse.ok) {
      return {
        ready: false,
        versionFound: false,
        tarballReachable: false,
        resolvedVersion: null,
        tarballUrl: null,
        error: `Registry responded with ${registryResponse.status}`,
      };
    }

    const payload = (await registryResponse.json()) as {
      versions?: Record<string, { dist?: { tarball?: string } }>;
    };

    const versionEntry = payload.versions?.[expectedVersion];
    if (!versionEntry) {
      return {
        ready: false,
        versionFound: false,
        tarballReachable: false,
        resolvedVersion: null,
        tarballUrl: null,
        error: `Version ${expectedVersion} is not visible yet`,
      };
    }

    const tarballUrl = versionEntry.dist?.tarball || null;
    if (!tarballUrl) {
      return {
        ready: false,
        versionFound: true,
        tarballReachable: false,
        resolvedVersion: expectedVersion,
        tarballUrl: null,
        error: 'Tarball URL is missing',
      };
    }

    const tarballReachable = await fetchTarball(fetchImpl, tarballUrl);
    return {
      ready: tarballReachable,
      versionFound: true,
      tarballReachable,
      resolvedVersion: expectedVersion,
      tarballUrl,
      error: tarballReachable ? null : 'Tarball is not reachable yet',
    };
  } catch (error) {
    return {
      ready: false,
      versionFound: false,
      tarballReachable: false,
      resolvedVersion: null,
      tarballUrl: null,
      error: error instanceof Error ? error.message : 'Unknown registry error',
    };
  }
}

function buildSandboxCheckScript(): string {
  return `
const packageName = process.argv[2];
const expectedVersion = process.argv[3];

function getRegistryUrl(name) {
  return \`https://registry.npmjs.org/\${name.replace(/\\//g, '%2f')}\`;
}

async function fetchTarball(url) {
  const headResponse = await fetch(url, { method: 'HEAD' });
  if (headResponse.ok) return true;
  if (headResponse.status !== 405 && headResponse.status !== 501) return false;
  const fallbackResponse = await fetch(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
  });
  return fallbackResponse.ok;
}

async function main() {
  try {
    const registryResponse = await fetch(getRegistryUrl(packageName));
    if (!registryResponse.ok) {
      console.log(JSON.stringify({
        ready: false,
        versionFound: false,
        tarballReachable: false,
        resolvedVersion: null,
        tarballUrl: null,
        error: \`Registry responded with \${registryResponse.status}\`,
      }));
      return;
    }

    const payload = await registryResponse.json();
    const versionEntry = payload.versions?.[expectedVersion];

    if (!versionEntry) {
      console.log(JSON.stringify({
        ready: false,
        versionFound: false,
        tarballReachable: false,
        resolvedVersion: null,
        tarballUrl: null,
        error: \`Version \${expectedVersion} is not visible yet\`,
      }));
      return;
    }

    const tarballUrl = versionEntry.dist?.tarball || null;
    if (!tarballUrl) {
      console.log(JSON.stringify({
        ready: false,
        versionFound: true,
        tarballReachable: false,
        resolvedVersion: expectedVersion,
        tarballUrl: null,
        error: 'Tarball URL is missing',
      }));
      return;
    }

    const tarballReachable = await fetchTarball(tarballUrl);
    console.log(JSON.stringify({
      ready: tarballReachable,
      versionFound: true,
      tarballReachable,
      resolvedVersion: expectedVersion,
      tarballUrl,
      error: tarballReachable ? null : 'Tarball is not reachable yet',
    }));
  } catch (error) {
    console.log(JSON.stringify({
      ready: false,
      versionFound: false,
      tarballReachable: false,
      resolvedVersion: null,
      tarballUrl: null,
      error: error instanceof Error ? error.message : 'Unknown registry error',
    }));
  }
}

main();
`.trim();
}

function createDefaultNotReadyResult(error: string): PackageAvailabilityResult {
  return {
    ready: false,
    versionFound: false,
    tarballReachable: false,
    resolvedVersion: null,
    tarballUrl: null,
    error,
  };
}

function parseSandboxResult(stdout: string): PackageAvailabilityResult {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return createDefaultNotReadyResult('Sandbox returned empty output');
  }

  try {
    return JSON.parse(trimmed) as PackageAvailabilityResult;
  } catch {
    const lastLine = trimmed.split('\n').pop() || trimmed;
    try {
      return JSON.parse(lastLine) as PackageAvailabilityResult;
    } catch {
      return createDefaultNotReadyResult('Sandbox returned invalid JSON');
    }
  }
}

export async function runSandboxPackageCheck(
  sandbox: SandboxLike,
  packageName: string,
  expectedVersion: string
): Promise<PackageAvailabilityResult> {
  const command = await sandbox.runCommand({
    cmd: 'node',
    args: [PACKAGE_CHECK_SCRIPT_PATH, packageName, expectedVersion],
    cwd: '/vercel/sandbox',
  });

  const stdout = await command.stdout();
  const stderr = await command.stderr();

  if (command.exitCode !== 0) {
    return createDefaultNotReadyResult((stderr || stdout || 'Sandbox command failed').trim());
  }

  return parseSandboxResult(stdout);
}

export async function waitForPackageAvailabilityWithSandbox(options: {
  packageName: string;
  expectedVersion: string;
  maxAttempts?: number;
  intervalMs?: number;
  createSandboxImpl?: SandboxFactory;
  sleepImpl?: (ms: number) => Promise<void>;
  onAttempt?: (update: SandboxAttemptUpdate) => Promise<void> | void;
}): Promise<SandboxMonitorResult> {
  const {
    packageName,
    expectedVersion,
    maxAttempts = PACKAGE_CHECK_MAX_ATTEMPTS,
    intervalMs = PACKAGE_CHECK_INTERVAL_MS,
    createSandboxImpl = Sandbox.create as unknown as SandboxFactory,
    sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    onAttempt,
  } = options;

  const sandbox = await createSandboxImpl({
    runtime: 'node24',
    timeout: maxAttempts * intervalMs + 60_000,
  });

  await sandbox.writeFiles([
    {
      path: PACKAGE_CHECK_SCRIPT_PATH,
      content: buildSandboxCheckScript(),
    },
  ]);

  let lastResult = createDefaultNotReadyResult('Package has not propagated yet');

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await runSandboxPackageCheck(sandbox, packageName, expectedVersion);
      lastResult = result;

      await onAttempt?.({
        attempt,
        sandboxId: sandbox.sandboxId,
        result,
      });

      if (result.ready) {
        return {
          status: 'ready',
          attempts: attempt,
          sandboxId: sandbox.sandboxId,
          lastError: '',
          lastResult: result,
        };
      }

      if (attempt < maxAttempts) {
        await sleepImpl(intervalMs);
      }
    }

    return {
      status: 'timeout',
      attempts: maxAttempts,
      sandboxId: sandbox.sandboxId,
      lastError: lastResult.error || 'Package is still unavailable',
      lastResult,
    };
  } finally {
    await cleanupSandbox(sandbox, 'package check');
  }
}

interface PackageCheckJobRecord {
  id: string;
  packageName: string;
  expectedVersion: string;
  email: string;
  status: PackageCheckJobStatus;
  maxAttempts: number;
  attempts: number;
  lastError: string;
  sandboxId: string;
  startedAt: Date | null;
  expiresAt: Date;
  readyAt: Date | null;
  notifiedAt: Date | null;
}

interface PackageCheckJobDelegateLike {
  findUnique: (args: { where: { id: string } }) => Promise<PackageCheckJobRecord | null>;
  update: (args: {
    where: { id: string };
    data: Partial<PackageCheckJobRecord>;
  }) => Promise<unknown>;
}

interface PrismaLike {
  packageCheckJob: PackageCheckJobDelegateLike;
}

export async function processPackageCheckJob(
  jobId: string,
  deps: {
    prismaClient?: PrismaLike;
    monitorPackage?: typeof waitForPackageAvailabilityWithSandbox;
    sendReadyEmail?: typeof sendPackageReadyEmail;
    now?: () => Date;
  } = {}
): Promise<void> {
  const prismaClient = deps.prismaClient || prisma;
  const monitorPackage = deps.monitorPackage || waitForPackageAvailabilityWithSandbox;
  const sendReadyEmail = deps.sendReadyEmail || sendPackageReadyEmail;
  const now = deps.now || (() => new Date());

  const job = await prismaClient.packageCheckJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return;
  if (!['pending', 'checking'].includes(job.status)) return;

  const startedAt = job.startedAt || now();
  if (job.expiresAt <= startedAt) {
    await prismaClient.packageCheckJob.update({
      where: { id: job.id },
      data: {
        status: 'timeout',
        startedAt,
        lastError: 'Job expired before the first check',
      },
    });
    return;
  }

  await prismaClient.packageCheckJob.update({
    where: { id: job.id },
    data: {
      status: 'checking',
      startedAt,
    },
  });

  try {
    const result = await monitorPackage({
      packageName: job.packageName,
      expectedVersion: job.expectedVersion,
      maxAttempts: job.maxAttempts,
      onAttempt: async ({ attempt, sandboxId, result: attemptResult }) => {
        await prismaClient.packageCheckJob.update({
          where: { id: job.id },
          data: {
            status: 'checking',
            attempts: attempt,
            sandboxId,
            startedAt,
            lastError: attemptResult.ready ? '' : (attemptResult.error || ''),
          },
        });
      },
    });

    if (result.status === 'ready') {
      await prismaClient.packageCheckJob.update({
        where: { id: job.id },
        data: {
          status: 'ready',
          attempts: result.attempts,
          sandboxId: result.sandboxId,
          readyAt: now(),
          lastError: '',
        },
      });

      try {
        await sendReadyEmail({
          email: job.email,
          packageName: job.packageName,
          version: job.expectedVersion,
        });

        await prismaClient.packageCheckJob.update({
          where: { id: job.id },
          data: { notifiedAt: now() },
        });
      } catch (error) {
        await prismaClient.packageCheckJob.update({
          where: { id: job.id },
          data: {
            lastError: error instanceof Error ? error.message : 'Email notification failed',
          },
        });
      }

      return;
    }

    await prismaClient.packageCheckJob.update({
      where: { id: job.id },
      data: {
        status: 'timeout',
        attempts: result.attempts,
        sandboxId: result.sandboxId,
        lastError: result.lastError,
      },
    });
  } catch (error) {
    await prismaClient.packageCheckJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        lastError: error instanceof Error ? error.message : 'Package check failed',
      },
    });
  }
}

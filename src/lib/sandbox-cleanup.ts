import { Sandbox } from '@vercel/sandbox';
import { getVercelOidcToken } from '@vercel/oidc';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SANDBOX_STALE_GRACE_MS = 60 * 60 * 1000;
export const SANDBOX_LIST_LIMIT = 200;

const CLEANABLE_STATUSES = new Set(['pending', 'running', 'stopping', 'snapshotting']);

export interface SandboxListItem {
  id: string;
  status: 'aborted' | 'failed' | 'pending' | 'running' | 'stopping' | 'stopped' | 'snapshotting';
  createdAt: number;
  updatedAt: number;
  timeout: number;
  startedAt?: number;
  requestedStopAt?: number;
}

export interface CleanupInactiveSandboxesResult {
  projectId: string;
  scanned: number;
  stopped: number;
  staleCandidates: number;
  cleaned: number;
  failed: number;
  staleGraceMs: number;
  cleanedSandboxIds: string[];
  failedSandboxIds: string[];
}

interface SandboxCredentials {
  projectId: string;
  teamId: string;
  token: string;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function parseOidcToken(token: string): { ownerId: string; projectId: string } {
  const payload = JSON.parse(decodeBase64Url(token.split('.')[1] || '')) as {
    owner_id?: unknown;
    project_id?: unknown;
  };

  if (typeof payload.owner_id !== 'string' || typeof payload.project_id !== 'string') {
    throw new Error('Invalid VERCEL_OIDC_TOKEN payload');
  }

  return {
    ownerId: payload.owner_id,
    projectId: payload.project_id,
  };
}

function readLocalProjectId(): string | null {
  const projectFile = join(process.cwd(), '.vercel', 'project.json');
  if (!existsSync(projectFile)) {
    return null;
  }

  try {
    const payload = JSON.parse(readFileSync(projectFile, 'utf8')) as { projectId?: unknown };
    return typeof payload.projectId === 'string' && payload.projectId.trim()
      ? payload.projectId
      : null;
  } catch {
    return null;
  }
}

function getProjectId(explicitProjectId?: string): string {
  const projectId = explicitProjectId || process.env.VERCEL_PROJECT_ID || readLocalProjectId();
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID is not set and .vercel/project.json is unavailable');
  }

  return projectId;
}

async function getSandboxCredentials(explicitProjectId?: string): Promise<SandboxCredentials> {
  const projectId = getProjectId(explicitProjectId);

  if (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID) {
    return {
      projectId,
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
    };
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    const payload = parseOidcToken(process.env.VERCEL_OIDC_TOKEN);
    return {
      projectId,
      token: process.env.VERCEL_OIDC_TOKEN,
      teamId: payload.ownerId,
    };
  }

  const token = await getVercelOidcToken({ project: projectId });
  const payload = parseOidcToken(token);

  return {
    projectId,
    token,
    teamId: payload.ownerId,
  };
}

function getLastActivityAt(sandbox: SandboxListItem): number {
  return sandbox.updatedAt || sandbox.startedAt || sandbox.createdAt;
}

function getExpectedDeadlineAt(sandbox: SandboxListItem): number {
  const base = sandbox.startedAt || sandbox.createdAt;
  return base + sandbox.timeout;
}

export function isInactiveSandbox(
  sandbox: SandboxListItem,
  now = Date.now(),
  staleGraceMs = SANDBOX_STALE_GRACE_MS
): boolean {
  if (!CLEANABLE_STATUSES.has(sandbox.status)) {
    return false;
  }

  const lastActivityAt = getLastActivityAt(sandbox);
  const lastAllowedActivityAt = lastActivityAt + staleGraceMs;

  if (sandbox.status === 'running') {
    const expectedDeadlineAt = getExpectedDeadlineAt(sandbox);
    return expectedDeadlineAt <= now || lastAllowedActivityAt <= now;
  }

  return lastAllowedActivityAt <= now;
}

export async function cleanupInactiveSandboxes(options: {
  projectId?: string;
  now?: number;
  limit?: number;
  staleGraceMs?: number;
  listSandboxes?: (params: { projectId: string; limit: number }) => Promise<{
    sandboxes: SandboxListItem[];
  } | {
    json: {
      sandboxes: SandboxListItem[];
    };
  }>;
  getSandbox?: (params: { sandboxId: string }) => Promise<{
    stop: (opts?: { blocking?: boolean }) => Promise<unknown>;
  }>;
} = {}): Promise<CleanupInactiveSandboxesResult> {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? SANDBOX_LIST_LIMIT;
  const staleGraceMs = options.staleGraceMs ?? SANDBOX_STALE_GRACE_MS;
  const projectId = getProjectId(options.projectId);

  let listSandboxes = options.listSandboxes;
  let getSandbox = options.getSandbox;

  if (!listSandboxes || !getSandbox) {
    const credentials = await getSandboxCredentials(projectId);
    listSandboxes = listSandboxes ?? ((params: { projectId: string; limit: number }) => Sandbox.list({
      ...credentials,
      ...params,
    }));
    getSandbox = getSandbox ?? ((params: { sandboxId: string }) => Sandbox.get({
      ...credentials,
      ...params,
    }));
  }

  const listResult = await listSandboxes({
    projectId,
    limit,
  });
  const sandboxes = 'json' in listResult ? listResult.json.sandboxes : listResult.sandboxes;

  const staleSandboxes = sandboxes.filter((sandbox) =>
    isInactiveSandbox(sandbox, now, staleGraceMs)
  );
  const stoppedCount = sandboxes.filter((sandbox) => sandbox.status === 'stopped').length;

  const cleanedSandboxIds: string[] = [];
  const failedSandboxIds: string[] = [];

  for (const sandboxMeta of staleSandboxes) {
    try {
      const sandbox = await getSandbox({ sandboxId: sandboxMeta.id });
      await sandbox.stop({ blocking: true });
      cleanedSandboxIds.push(sandboxMeta.id);
    } catch (error) {
      console.error(`Failed to clean sandbox ${sandboxMeta.id}:`, error);
      failedSandboxIds.push(sandboxMeta.id);
    }
  }

  return {
    projectId,
    scanned: sandboxes.length,
    stopped: stoppedCount,
    staleCandidates: staleSandboxes.length,
    cleaned: cleanedSandboxIds.length,
    failed: failedSandboxIds.length,
    staleGraceMs,
    cleanedSandboxIds,
    failedSandboxIds,
  };
}

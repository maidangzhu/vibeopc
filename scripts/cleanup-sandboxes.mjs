import { Sandbox } from '@vercel/sandbox';
import { getVercelOidcToken } from '@vercel/oidc';
import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_STALE_GRACE_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 200;
const CLEANABLE_STATUSES = new Set(['pending', 'running', 'stopping', 'snapshotting']);

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

function readLocalProjectId() {
  const projectFile = join(process.cwd(), '.vercel', 'project.json');
  if (!existsSync(projectFile)) return null;

  try {
    const payload = JSON.parse(readFileSync(projectFile, 'utf8'));
    return typeof payload.projectId === 'string' ? payload.projectId : null;
  } catch {
    return null;
  }
}

function getArgFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function parseOidcToken(token) {
  const payload = JSON.parse(decodeBase64Url(token.split('.')[1] || ''));
  if (typeof payload.owner_id !== 'string' || typeof payload.project_id !== 'string') {
    throw new Error('Invalid VERCEL_OIDC_TOKEN payload');
  }

  return {
    ownerId: payload.owner_id,
    projectId: payload.project_id,
  };
}

async function getCredentials(projectId) {
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID) {
    return {
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      projectId,
    };
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    const payload = parseOidcToken(process.env.VERCEL_OIDC_TOKEN);
    return {
      token: process.env.VERCEL_OIDC_TOKEN,
      teamId: payload.ownerId,
      projectId,
    };
  }

  const token = await getVercelOidcToken({ project: projectId });
  const payload = parseOidcToken(token);

  return {
    token,
    teamId: payload.ownerId,
    projectId,
  };
}

function getLastActivityAt(sandbox) {
  return sandbox.updatedAt || sandbox.startedAt || sandbox.createdAt;
}

function getExpectedDeadlineAt(sandbox) {
  return (sandbox.startedAt || sandbox.createdAt) + sandbox.timeout;
}

function isInactiveSandbox(sandbox, now, staleGraceMs) {
  if (!CLEANABLE_STATUSES.has(sandbox.status)) {
    return false;
  }

  const lastAllowedActivityAt = getLastActivityAt(sandbox) + staleGraceMs;
  if (sandbox.status === 'running') {
    return getExpectedDeadlineAt(sandbox) <= now || lastAllowedActivityAt <= now;
  }

  return lastAllowedActivityAt <= now;
}

async function main() {
  const projectId = process.env.VERCEL_PROJECT_ID || readLocalProjectId();
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID is not set and .vercel/project.json is unavailable');
  }

  const limit = Number(getArgValue('--limit', String(DEFAULT_LIMIT)));
  const staleGraceMs = Number(
    getArgValue('--stale-grace-ms', String(DEFAULT_STALE_GRACE_MS))
  );
  const now = Date.now();
  const dryRun = getArgFlag('--dry-run');
  const listOnly = getArgFlag('--list-only');
  const credentials = await getCredentials(projectId);

  const listResult = await Sandbox.list({
    ...credentials,
    limit,
  });
  const sandboxes = listResult.json?.sandboxes ?? listResult.sandboxes;

  const stoppedSandboxes = sandboxes.filter((sandbox) => sandbox.status === 'stopped');
  const staleSandboxes = sandboxes.filter((sandbox) =>
    isInactiveSandbox(sandbox, now, staleGraceMs)
  );

  console.log(`projectId: ${projectId}`);
  console.log(`scanned: ${sandboxes.length}`);
  console.log(`stopped: ${stoppedSandboxes.length}`);
  console.log(`stale active candidates: ${staleSandboxes.length}`);

  if (stoppedSandboxes.length > 0) {
    console.log('\nstopped sandboxes:');
    for (const sandbox of stoppedSandboxes) {
      console.log(`- ${sandbox.id} updatedAt=${new Date(sandbox.updatedAt).toISOString()}`);
    }
  }

  if (listOnly || dryRun || staleSandboxes.length === 0) {
    if (dryRun && staleSandboxes.length > 0) {
      console.log('\ndry-run candidates:');
      for (const sandbox of staleSandboxes) {
        console.log(`- ${sandbox.id} status=${sandbox.status} updatedAt=${new Date(sandbox.updatedAt).toISOString()}`);
      }
    }
    return;
  }

  const cleanedSandboxIds = [];
  const failedSandboxIds = [];

  for (const sandboxMeta of staleSandboxes) {
    try {
      const sandbox = await Sandbox.get({
        ...credentials,
        sandboxId: sandboxMeta.id,
      });
      await sandbox.stop({ blocking: true });
      cleanedSandboxIds.push(sandboxMeta.id);
      console.log(`cleaned: ${sandboxMeta.id}`);
    } catch (error) {
      failedSandboxIds.push(sandboxMeta.id);
      console.error(`failed: ${sandboxMeta.id}`, error);
    }
  }

  console.log('\nsummary:');
  console.log(`cleaned: ${cleanedSandboxIds.length}`);
  console.log(`failed: ${failedSandboxIds.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { Sandbox } from '@vercel/sandbox';

async function cleanupSandbox(
  sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null,
  context: string
): Promise<void> {
  if (!sandbox) return;

  try {
    await sandbox.stop({ blocking: true });
  } catch (error) {
    console.error(`${context} sandbox cleanup failed:`, error);
  }
}

export async function checkPackageExists(packageName: string): Promise<boolean> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

export async function publishToNpm(
  files: Record<string, string>,
  options: {
    packageName: string;
    authToken: string;
  }
): Promise<{ success: boolean; message: string }> {
  const { packageName, authToken } = options;

  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null;

  try {
    // Start an ephemeral sandbox VM
    sandbox = await Sandbox.create({
      runtime: 'node24',
      timeout: 5 * 60 * 1000, // 5 minutes
      env: {
        NPM_PUBLISH_TOKEN: authToken,
      },
    });

    // Write all files to the sandbox
    await sandbox.writeFiles([
      ...Object.entries(files).map(([filePath, content]) => ({
        path: `/vercel/sandbox/${filePath}`,
        content,
      })),
      // Write .npmrc with auth token
      {
        path: '/vercel/sandbox/.npmrc',
        content: `//registry.npmjs.org/:_authToken=${authToken}\nregistry=https://registry.npmjs.org/\n`,
      },
    ]);

    // Run npm publish inside the sandbox
    const result = await sandbox.runCommand({
      cmd: 'npm',
      args: ['publish', '--access', 'public'],
      cwd: '/vercel/sandbox',
    });

    const stdout = await result.stdout();
    const stderr = await result.stderr();

    if (result.exitCode !== 0) {
      return { success: false, message: (stderr || stdout || 'npm publish failed').trim() };
    }

    return {
      success: true,
      message: stdout.includes('+')
        ? stdout.trim()
        : `Package ${packageName} published successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '发布失败',
    };
  } finally {
    await cleanupSandbox(sandbox, 'npm publish');
  }
}

import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export async function checkPackageExists(packageName: string): Promise<boolean> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}`);
    return res.ok;
  } catch {
    return false;
  }
}

async function runCommand(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '', code: error?.code || 0 });
    });
  });
}

export async function publishToNpm(
  files: Record<string, string>,
  options: {
    packageName: string;
    authToken: string;
  }
): Promise<{ success: boolean; message: string }> {
  const { packageName, authToken } = options;

  try {
    // Create temporary directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-publish-'));
    const pkgDir = path.join(tmpDir, 'pkg');
    fs.mkdirSync(pkgDir, { recursive: true });

    // Write all files
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(pkgDir, filePath);
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    // Create .npmrc with auth - matches what works when running npm from /tmp
    fs.writeFileSync(
      path.join(pkgDir, '.npmrc'),
      `//registry.npmjs.org/:_authToken=${authToken}\nregistry=https://registry.npmjs.org/\n`
    );

    // Run npm publish
    const { stdout, stderr, code } = await runCommand(
      `npm publish --access public --registry https://registry.npmjs.org`,
      pkgDir
    );

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    if (code !== 0) {
      return { success: false, message: (stderr || stdout).trim() };
    }

    return {
      success: true,
      message: stdout.includes('+') ? stdout.trim() : `Package ${packageName} published successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '发布失败',
    };
  }
}

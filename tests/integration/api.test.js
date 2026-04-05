/**
 * Integration tests — API 端到端测试
 *
 * 测试流程:
 * 1. 启动/检测 Next.js dev server
 * 2. 测试 profile CRUD 接口
 * 3. 测试 publish 接口（发布 npm 包）
 * 4. 验证 npx @vibeopc/testpublish-X 命令可执行
 */

const { spawn } = require('child_process');
const http = require('http');

const TEST_USERNAME_BASE = 'testpublish';
const TEST_PACKAGES = [
  `${TEST_USERNAME_BASE}-1`,
  `${TEST_USERNAME_BASE}-2`,
  `${TEST_USERNAME_BASE}-3`,
  `${TEST_USERNAME_BASE}-4`,
];

let PORT = process.env.TEST_PORT || '3001';
let BASE_URL = `http://localhost:${PORT}`;
let serverProcess = null;

// ─── Helpers ─────────────────────────────────────────────────────────

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => { s.close(); resolve(false); });
    s.listen(port);
  });
}

function isVibeOPCPort(port) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}/`, (res) => {
      // VibeOPC serves HTML with "VibeOPC" in the title/body
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(data.includes('VibeOPC') && !data.includes('apps_blog'));
      });
      res.on('error', () => resolve(false));
    }).on('error', () => resolve(false));
  });
}

function waitForServer(url, timeout = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(3000, () => { req.destroy(); retry(); });
    }
    function retry() {
      if (Date.now() - start > timeout) {
        reject(new Error(`Server not ready after ${timeout}ms at ${url}`));
      } else {
        setTimeout(check, 2000);
      }
    }
    check();
  });
}

function httpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function execAsync(cmd, args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`${cmd} ${args.join(' ')} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

// ─── Test fixtures ────────────────────────────────────────────────────

function makeProfile(username, index) {
  return {
    username,
    name: `测试用户${index}`,
    bio: `这是测试简介${index}`,
    avatarUrl: '',
    location: '杭州',
    templateId: 'personal',
    socialLinks: [
      { platform: 'github', url: `https://github.com/user${index}` },
      { platform: 'twitter', url: `https://twitter.com/user${index}` },
    ],
    commands: [
      { id: '1', name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' },
      { id: '2', name: 'skills', description: '我的技能', content: `技能${index}\n- React\n- Node.js`, templateType: 'list' },
      { id: '3', name: 'projects', description: '我的项目', content: `项目${index}介绍`, templateType: 'markdown' },
      { id: '4', name: 'links', description: '链接', content: '', templateType: 'keyvalue' },
    ],
  };
}

// ─── Lifecycle ────────────────────────────────────────────────────────

// 每次测试前清理 npm 缓存，避免 404 缓存导致包已发布却安装失败
beforeAll(async () => {
  console.log('🧹 清理 npm 缓存...');
  await execAsync('npm', ['cache', 'clean', '--force'], 10000);
  console.log('✅ npm 缓存已清理\n');
}, 15000);

beforeAll(async () => {
  // 优先使用环境变量指定的端口
  if (process.env.TEST_PORT) {
    PORT = process.env.TEST_PORT;
    BASE_URL = `http://localhost:${PORT}`;
    const inUse = await isPortInUse(Number(PORT));
    if (!inUse) {
      throw new Error(`TEST_PORT=${PORT} 指定了端口但服务未运行`);
    }
    console.log(`\n✅ 使用指定端口 ${PORT}`);
    await waitForServer(`${BASE_URL}/`);
    return;
  }

  // 自动检测 VibeOPC 运行在哪个端口
  for (const candidate of [3000, 3001, 3002]) {
    const inUse = await isPortInUse(candidate);
    if (!inUse) continue;
    const isVibe = await isVibeOPCPort(candidate);
    if (isVibe) {
      PORT = String(candidate);
      BASE_URL = `http://localhost:${PORT}`;
      console.log(`\n✅ 自动检测到 VibeOPC 运行在端口 ${PORT}`);
      await waitForServer(`${BASE_URL}/`);
      return;
    }
  }

  // 没找到，尝试启动新服务器
  console.log(`\n🚀 未检测到 VibeOPC，启动新服务器（端口 3001）...`);
  PORT = '3001';
  BASE_URL = `http://localhost:${PORT}`;
  serverProcess = spawn('npx', ['next', 'dev', '-p', '3001'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', (d) => process.stdout.write(d.toString()));
  serverProcess.stderr.on('data', (d) => process.stderr.write(d.toString()));
  serverProcess.on('error', (e) => { throw e; });
  await waitForServer(`${BASE_URL}/`);
  console.log('✅ Server ready\n');
}, 120000);

afterAll(async () => {
  if (serverProcess) {
    console.log('\n🛑 关闭测试 dev server...');
    serverProcess.kill('SIGTERM');
    await wait(2000);
  }
});

// ─── 单接口测试 ──────────────────────────────────────────────────────

describe('API: POST /api/profile — 保存 profile', () => {
  it('保存新 profile 返回 200', async () => {
    const profile = makeProfile(`${TEST_USERNAME_BASE}-1`, 1);
    const res = await httpRequest('POST', '/api/profile', profile);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.username).toBe(`${TEST_USERNAME_BASE}-1`);
    expect(res.body.profile.commands).toHaveLength(4);
    expect(res.body.profile.socialLinks).toHaveLength(2);
  });

  it('缺少必填字段返回 400', async () => {
    const res = await httpRequest('POST', '/api/profile', { username: 'onlyuser' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('username 格式非法返回 400', async () => {
    const res = await httpRequest('POST', '/api/profile', {
      username: 'UPPERCASE', name: 'Test',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('小写字母');
  });

  it('重复保存同一用户更新已有数据', async () => {
    const profile = makeProfile(`${TEST_USERNAME_BASE}-1`, 1);
    profile.name = '更新后的名字';
    const res = await httpRequest('POST', '/api/profile', profile);
    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe('更新后的名字');
  });
});

describe('API: GET /api/profile/[username] — 读取 profile', () => {
  it('已存在的 profile 返回 200', async () => {
    const res = await httpRequest('GET', `/api/profile/${TEST_USERNAME_BASE}-1`);
    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe(`${TEST_USERNAME_BASE}-1`);
    expect(res.body.profile.name).toBe('更新后的名字');
    expect(Array.isArray(res.body.profile.commands)).toBe(true);
    expect(Array.isArray(res.body.profile.socialLinks)).toBe(true);
  });

  it('不存在的 profile 返回 404', async () => {
    const res = await httpRequest('GET', '/api/profile/nonexistent-user-xyz');
    expect(res.status).toBe(404);
  });

  it('命令包含 templateType 字段', async () => {
    const res = await httpRequest('GET', `/api/profile/${TEST_USERNAME_BASE}-1`);
    expect(res.status).toBe(200);
    const cmd = res.body.profile.commands.find((c) => c.name === 'whoami');
    expect(cmd.templateType).toBeDefined();
    expect(typeof cmd.templateType).toBe('string');
  });
});

// ─── 流程串联测试 ────────────────────────────────────────────────────

describe('流程: 保存 → 发布 → 验证 npx 命令', () => {
  for (let i = 2; i <= 4; i++) {
    const username = `${TEST_USERNAME_BASE}-${i}`;
    const profile = makeProfile(username, i);

    describe(`包 #${i}: @vibeopc/${username}`, () => {
      it(`(a) 保存 profile`, async () => {
        const res = await httpRequest('POST', '/api/profile', profile);
        expect(res.status).toBe(200);
        expect(res.body.profile.username).toBe(username);
      });

      it(`(b) 读取已保存的 profile`, async () => {
        const res = await httpRequest('GET', `/api/profile/${username}`);
        expect(res.status).toBe(200);
        expect(res.body.profile.name).toBe(`测试用户${i}`);
        expect(res.body.profile.commands).toHaveLength(4);
        expect(res.body.profile.templateId).toBe('personal');
      });

      it(`(c) 发布到 npm`, async () => {
        const res = await httpRequest('POST', '/api/publish', { username });
        if (res.status === 500 && String(res.body.error).includes('token')) {
          console.warn(`⚠️  NPM_PUBLISH_TOKEN 未配置，跳过发布测试（包 ${username}）`);
          return;
        }
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.packageName).toBe(`@vibeopc/${username}`);
        expect(res.body.version).toBeDefined();
        expect(res.body.command).toContain(`npx @vibeopc/${username}`);
      });

      it(`(d) 等待 15 秒后验证 npx @vibeopc/${username} 可执行`, async () => {
        const res = await httpRequest('POST', '/api/publish', { username });
        if (res.status === 500 && String(res.body.error).includes('token')) {
          return;
        }
        console.log(`   [${username}] 等待 npm 包传播 (~15s)...`);
        await wait(18000);
        const npmRes = await execAsync('npx', [`@vibeopc/${username}`], 60000);
        expect(npmRes.code).toBe(0);
        expect(npmRes.stdout + npmRes.stderr).toContain(`测试用户${i}`);
      }, 60000);

      it(`(e) 验证 npx @vibeopc/${username} whoami 命令`, async () => {
        const res = await httpRequest('POST', '/api/publish', { username });
        if (res.status === 500 && String(res.body.error).includes('token')) {
          return;
        }
        await wait(15000);
        const cmdRes = await execAsync('npx', [`@vibeopc/${username}`, 'whoami'], 60000);
        expect(cmdRes.code).toBe(0);
        expect(cmdRes.stdout + cmdRes.stderr).toContain('姓名');
      }, 60000);
    });
  }
});

describe('API: 模板切换测试', () => {
  it('切换到 minimal 模板后保存，命令数量对应新模板', async () => {
    const minimalProfile = {
      username: `${TEST_USERNAME_BASE}-1`,
      name: '模板切换测试',
      bio: '测试',
      location: '北京',
      templateId: 'minimal',
      socialLinks: [],
      commands: [
        { id: '1', name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' },
        { id: '2', name: 'links', description: '链接', content: '', templateType: 'keyvalue' },
      ],
    };
    const res = await httpRequest('POST', '/api/profile', minimalProfile);
    expect(res.status).toBe(200);

    const getRes = await httpRequest('GET', `/api/profile/${TEST_USERNAME_BASE}-1`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.profile.commands).toHaveLength(2);
    expect(getRes.body.profile.templateId).toBe('minimal');
  });
});

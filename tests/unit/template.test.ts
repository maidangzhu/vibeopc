import { generatePackageJSON, generateIndex, generatePackage } from '@/lib/template';
import { UserProfile } from '@/lib/types';

const baseProfile: UserProfile = {
  username: 'testuser',
  name: '测试用户',
  bio: '全栈工程师',
  avatarUrl: '',
  location: '杭州',
  templateId: 'personal',
  socialLinks: [
    { platform: 'GitHub', url: 'https://github.com/testuser' },
    { platform: 'Twitter', url: 'https://twitter.com/testuser' },
  ],
  commands: [],
};

describe('generatePackageJSON', () => {
  it('生成正确的 package.json 结构', () => {
    const json = generatePackageJSON(baseProfile);
    const pkg = JSON.parse(json);
    expect(pkg.name).toBe('@vibeopc/testuser');
    expect(pkg.version).toBe('1.0.1');
    expect(pkg.bin).toEqual({ testuser: './index.js' });
    expect(pkg.files).toEqual(['index.js', 'README.md']);
    expect(pkg.readme).toEqual(''); // 直接调用时 readme 为空，通过 generatePackage 调用时会自动填充
    expect(pkg.engines).toEqual({ node: '>=16' });
    expect(pkg.author).toBe('测试用户');
    expect(pkg.license).toBe('MIT');
  });

  it('可指定自定义版本号', () => {
    const json = generatePackageJSON(baseProfile, '2.0.0');
    const pkg = JSON.parse(json);
    expect(pkg.version).toBe('2.0.0');
  });

  it('package.json 可以被 JSON.parse', () => {
    expect(() => JSON.parse(generatePackageJSON(baseProfile))).not.toThrow();
  });
});

describe('generateIndex', () => {
  it('生成 shebang', () => {
    const index = generateIndex(baseProfile);
    expect(index).toContain('#!/usr/bin/env node');
  });

  it('包含所有命令的 case 语句', () => {
    const profile: UserProfile = {
      ...baseProfile,
      commands: [
        { id: '1', name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' },
        { id: '2', name: 'skills', description: '技能', content: 'React\nNode.js', templateType: 'list' },
        { id: '3', name: 'links', description: '链接', content: '', templateType: 'keyvalue' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain("case 'whoami':");
    expect(index).toContain("case 'skills':");
    expect(index).toContain("case 'links':");
  });

  it('包含 username 在 help 路径中', () => {
    const index = generateIndex(baseProfile);
    expect(index).toContain('@vibeopc/testuser');
  });

  it('whoami 命令中包含 profile 的 name 和 bio', () => {
    const profile: UserProfile = {
      ...baseProfile,
      commands: [
        { id: '1', name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain('姓名：测试用户');
    expect(index).toContain('简介：全栈工程师');
  });

  it('links 命令在 socialLinks 非空时包含平台和 URL', () => {
    const profile: UserProfile = {
      ...baseProfile,
      socialLinks: [
        { platform: 'github', url: 'https://github.com/testuser' },
        { platform: 'twitter', url: 'https://twitter.com/testuser' },
      ],
      commands: [
        { id: '1', name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' },
        { id: '2', name: 'links', description: '链接', content: '', templateType: 'keyvalue' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain('GitHub');
    expect(index).toContain('https://github.com/testuser');
    expect(index).toContain('Twitter');
    expect(index).toContain('https://twitter.com/testuser');
  });

  it('links 命令在 socialLinks 为空时显示暂无链接', () => {
    const profile: UserProfile = {
      ...baseProfile,
      socialLinks: [],
      commands: [
        { id: '1', name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' },
        { id: '2', name: 'links', description: '链接', content: '', templateType: 'keyvalue' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain('暂无链接');
  });

  it('templateType=keyvalue 的命令渲染为键值对格式', () => {
    const profile: UserProfile = {
      ...baseProfile,
      commands: [
        { id: '1', name: 'custom', description: '自定义', content: '姓名: 张三\n年龄: 18', templateType: 'keyvalue' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain("case 'custom':");
    // keyvalue 渲染器会生成带 gray/white 颜色的 log 语句
    expect(index).toContain('log(');
  });

  it('templateType=list 的命令渲染为列表格式', () => {
    const profile: UserProfile = {
      ...baseProfile,
      commands: [
        { id: '1', name: 'projects', description: '项目', content: '项目A\n项目B', templateType: 'list' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain("case 'projects':");
    expect(index).toContain("'\\u2022 '");
  });

  it('空 content 不产生空 log 语句', () => {
    const profile: UserProfile = {
      ...baseProfile,
      commands: [
        { id: '1', name: 'empty', description: '空命令', content: '', templateType: 'free' },
      ],
    };
    const index = generateIndex(profile);
    expect(index).toContain("case 'empty':");
  });

  it('包含 help 和 version 处理', () => {
    const index = generateIndex(baseProfile);
    expect(index).toContain('--help');
    expect(index).toContain('--version');
    expect(index).toContain("command === '--help'");
    expect(index).toContain("command === '--version'");
  });

  it('generatePackage 返回 package.json、index.js 和 README.md', () => {
    const files = generatePackage(baseProfile);
    expect(Object.keys(files)).toContain('package.json');
    expect(Object.keys(files)).toContain('index.js');
    expect(Object.keys(files)).toContain('README.md');
    expect(typeof files['package.json']).toBe('string');
    expect(typeof files['index.js']).toBe('string');
    expect(typeof files['README.md']).toBe('string');
  });

  it('generatePackage 生成的 README 包含用户信息', () => {
    const files = generatePackage(baseProfile);
    const readme = files['README.md'];
    expect(readme).toContain('测试用户');
    expect(readme).toContain('@vibeopc/testuser');
    expect(readme).toContain('GitHub');
    expect(readme).toContain('VibeOPC');
  });
});

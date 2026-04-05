#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

// Profile data
const profile = {
  name: '麦当',
  bio: '全栈工程师 / AI 爱好者 / 独立开发者',
  location: '杭州',
  username: 'maidang',
  commands: [
    { name: 'whoami', description: '关于我' },
    { name: 'skills', description: '我的技能' },
    { name: 'projects', description: '我的项目' },
    { name: 'links', description: '链接' },
  ],
  socialLinks: [
    { platform: 'GitHub', url: 'https://github.com/maidang' },
    { platform: 'Twitter', url: 'https://twitter.com/maidang' },
  ],
};

// ANSI Colors
const reset = '\x1b[0m';
const bright = '\x1b[1m';
const green = '\x1b[32m';
const blue = '\x1b[34m';
const gray = '\x1b[90m';
const white = '\x1b[97m';
const cyan = '\x1b[36m';

function log(text) {
  console.log((text || '') + reset);
}

function divider() {
  log(gray + '────────────────────────────────────────' + reset);
}

function showHelp() {
  log();
  log(bright + '我是 ' + profile.name + reset);
  log(gray + profile.bio + ' · ' + profile.location + reset);
  divider();
  log();
  log(gray + '用法:' + reset);
  log(cyan + '  npx @vibeopc/' + profile.username + ' [命令]' + reset);
  log();
  log(gray + '可用命令:' + reset);
  log('  ' + profile.username);
  log(gray + '  ──────────' + reset);
  for (const cmd of profile.commands) {
    log('  ' + cmd.name.padEnd(12) + cmd.description);
  }
  log(gray + '  ────────────' + reset);
  log('  --help       显示帮助信息');
  log('  --version    显示版本信息');
  log();
  log('  不带参数运行显示主菜单');
  log();
  divider();
  log();
}

function showVersion() {
  log('1.0.1');
}

function main() {
  // Handle --help and --version
  if (command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  if (command === '--version' || command === '-v') {
    showVersion();
    return;
  }

  log();
  log(bright + '我是 ' + profile.name + reset);
  log(gray + profile.bio + (profile.location ? ' · ' + profile.location : '') + reset);
  divider();

  if (!command) {
    log();
    for (const cmd of profile.commands) {
      log(green + '  ' + cmd.name.padEnd(12) + reset + gray + cmd.description + reset);
    }
    log();
    divider();
    log();
    log(gray + '❯ ' + reset);
    process.stdout.write(' '.repeat(2));
    return;
  }

  switch (command) {
    case 'whoami':
      log();
      divider();
      log();
      log(white + '姓名：' + profile.name + reset);
      log(white + '位置：' + profile.location + reset);
      log(white + '简介：' + profile.bio + reset);
      log();
      divider();
      log();
      log(green + '如果你想了解更多，欢迎联系！' + reset);
      log();
      break;

    case 'skills':
      log();
      log(blue + '🛠 技术栈' + reset);
      log('  - 前端：React / Vue / Next.js');
      log('  - 后端：Node.js / Python');
      log('  - AI：LLM 应用开发 / Prompt Engineering');
      log();
      log(blue + '📚 正在学习' + reset);
      log('  - AI Agent 开发');
      log('  - MCP 协议');
      log();
      log(blue + '💡 兴趣' + reset);
      log('  - 产品设计');
      log('  - 独立开发');
      log();
      break;

    case 'projects':
      log();
      log(blue + '📦 项目' + reset);
      log('  暂无项目（期待中...）');
      log();
      break;

    case 'links':
      log();
      log(blue + '🔗 链接' + reset);
      for (const link of profile.socialLinks) {
        log('  - ' + link.platform + ': ' + link.url);
      }
      log();
      break;

    default:
      log();
      log(gray + '未知命令: ' + command + reset);
      log('运行 --help 查看可用命令');
      log();
  }
}

main();

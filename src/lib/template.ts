import { UserProfile } from './types';

export function generatePackageJSON(profile: UserProfile): string {
  return JSON.stringify(
    {
      name: `@vibeopc/${profile.username}`,
      version: '1.0.1',
      description: `${profile.name} 的 CLI 名片 - ${profile.bio}`,
      bin: {
        [profile.username]: './index.js',
      },
      files: ['index.js'],
      engines: { node: '>=16' },
      author: profile.name,
      license: 'MIT',
    },
    null,
    2
  );
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function lines(content: string): string {
  // Return a JS string array expression with each line escaped
  return content
    .split('\n')
    .map((line) => `'${escape(line)}'`)
    .join(',\n    ');
}

export function generateIndex(profile: UserProfile): string {
  const { name, bio, location, commands, socialLinks } = profile;

  // Build command switch cases
  const cases = commands.map((cmd) => {
    if (cmd.name === 'whoami') {
      const location2 = location || '未知';
      const bio2 = bio || '暂无简介';
      return [
        `    case '${cmd.name}':`,
        `      log();`,
        `      divider();`,
        `      log();`,
        `      log(white + '姓名：${escape(name)}' + reset);`,
        `      log(white + '位置：${escape(location2)}' + reset);`,
        `      log(white + '简介：${escape(bio2)}' + reset);`,
        `      log();`,
        `      divider();`,
        `      log();`,
        `      log(green + '如果你想了解更多，欢迎联系！' + reset);`,
        `      log();`,
        `      break;`,
      ].join('\n');
    }
    if (cmd.name === 'skills' || cmd.name === 'projects') {
      const content = cmd.content || (cmd.name === 'skills' ? '🛠 技术栈\n  暂无技能信息' : '📦 项目\n  暂无项目');
      return [
        `    case '${cmd.name}':`,
        `      log();`,
        `      log(${lines(content)});`,
        `      log();`,
        `      break;`,
      ].join('\n');
    }
    if (cmd.name === 'links') {
      if (socialLinks.length === 0 || !cmd.content) {
        return [
          `    case '${cmd.name}':`,
          `      log();`,
          `      log(blue + '🔗 链接' + reset);`,
          `      log('  暂无链接');`,
          `      log();`,
          `      break;`,
        ].join('\n');
      }
      return [
        `    case '${cmd.name}':`,
        `      log();`,
        `      log(${lines(cmd.content)});`,
        `      log();`,
        `      break;`,
      ].join('\n');
    }
    // Custom command
    const content = cmd.content || '';
    return [
      `    case '${cmd.name}':`,
      `      log();`,
      `      log(${lines(content)});`,
      `      log();`,
      `      break;`,
    ].join('\n');
  }).join('\n');

  // Menu items (main display)
  const menu = commands.map((cmd) =>
    `    log(green + '  ${escape(cmd.name)}'.padEnd(12) + reset + gray + '${escape(cmd.description)}' + reset);`
  ).join('\n');

  // Help items
  const helpCmds = commands.map((cmd) =>
    `  '${escape(cmd.name).padEnd(12)} ${escape(cmd.description)}'`
  ).join(',\n    ');

  // Links content for help
  const linksContent = socialLinks.length > 0
    ? socialLinks.map((l) => `  - ${l.platform}: ${l.url}`).join('\n')
    : '暂无链接';

  return [
    `#!/usr/bin/env node`,
    ``,
    `const args = process.argv.slice(2);`,
    `const command = args[0];`,
    ``,
    `// ANSI Colors`,
    `const reset = '\\x1b[0m';`,
    `const bright = '\\x1b[1m';`,
    `const green = '\\x1b[32m';`,
    `const blue = '\\x1b[34m';`,
    `const gray = '\\x1b[90m';`,
    `const white = '\\x1b[97m';`,
    `const cyan = '\\x1b[36m';`,
    ``,
    `function log(text) {`,
    `  console.log((text || '') + reset);`,
    `}`,
    ``,
    `function divider() {`,
    `  log(gray + '────────────────────────────────────────' + reset);`,
    `}`,
    ``,
    `function showHelp() {`,
    `  log();`,
    `  log(bright + '我是 ${escape(name)}' + reset);`,
    `  log(gray + '${escape(bio)}' + reset);`,
    `  divider();`,
    `  log();`,
    `  log(gray + '用法:' + reset);`,
    `  log(cyan + '  npx @vibeopc/${escape(profile.username)} [命令]' + reset);`,
    `  log();`,
    `  log(gray + '可用命令:' + reset);`,
    `  log('  npx @vibeopc/${escape(profile.username)}');`,
    `  log(gray + '  ' + '─'.repeat(14) + reset);`,
    `    log(${helpCmds});`,
    `  log(gray + '  ' + '─'.repeat(14) + reset);`,
    `  log('  --help       显示帮助信息');`,
    `  log('  --version    显示版本信息');`,
    `  log();`,
    `  log('  不带参数运行显示主菜单');`,
    `  log();`,
    `  divider();`,
    `  log();`,
    `}`,
    ``,
    `function showVersion() {`,
    `  log('1.0.1');`,
    `}`,
    ``,
    `function main() {`,
    `  if (command === '--help' || command === '-h') {`,
    `    showHelp();`,
    `    return;`,
    `  }`,
    `  if (command === '--version' || command === '-v') {`,
    `    showVersion();`,
    `    return;`,
    `  }`,
    ``,
    `  log();`,
    `  log(bright + '我是 ${escape(name)}' + reset);`,
    `  log(gray + '${escape(bio)}${location ? ' · ' + escape(location) : ''}' + reset);`,
    `  divider();`,
    ``,
    `  if (!command) {`,
    `    log();`,
    menu,
    `    log();`,
    `    divider();`,
    `    log();`,
    `    log(gray + '❯ ' + reset);`,
    `    process.stdout.write(' '.repeat(2));`,
    `    return;`,
    `  }`,
    ``,
    `  switch (command) {`,
    cases,
    `    default:`,
    `      log();`,
    `      log(gray + '未知命令: ' + command + reset);`,
    `      log('运行 --help 查看可用命令');`,
    `      log();`,
    `  }`,
    `}`,
    ``,
    `main();`,
  ].join('\n');
}

export function generatePackage(profile: UserProfile): Record<string, string> {
  return {
    'package.json': generatePackageJSON(profile),
    'index.js': generateIndex(profile),
  };
}

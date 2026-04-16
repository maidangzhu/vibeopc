import { UserProfile, TemplateType } from './types';

// ─── Content renderers ─────────────────────────────────────────

/** free: 逐行原样输出 */
function renderFree(lines: string[]): string {
  return lines.map((l) => `log('${escape(l)}');`).join('\n');
}

/** keyvalue: 每行按 "label: value" 或 "label value" 解析并着色 */
function renderKeyValue(lines: string[]): string {
  return lines
    .filter((l) => l.trim())
    .map((l) => {
      const colon = l.indexOf(':');
      if (colon > 0) {
        const k = l.slice(0, colon).trim();
        const v = l.slice(colon + 1).trim();
        return `log(gray + '${escape(k)}' + reset + white + ': ${escape(v)}' + reset);`;
      }
      // 没有冒号：整个居左显示
      return `log(white + '${escape(l)}' + reset);`;
    })
    .join('\n') || `log(gray + '暂无内容' + reset);`;
}

/** list: 每行前面加 · 符号 */
function renderList(lines: string[]): string {
  return lines
    .filter((l) => l.trim())
    .map((l) => `log('  ' + green + '\\u2022 ' + reset + white + '${escape(l)}' + reset);`)
    .join('\n') || `log(gray + '暂无内容' + reset);`;
}

/** grouplist: 检测 ## 标题行，其他行缩进 */
function renderGroupList(lines: string[]): string {
  return lines
    .map((l) => {
      const trimmed = l.trim();
      if (trimmed.startsWith('## ') || trimmed.startsWith('**')) {
        // Section header
        const title = trimmed.replace(/^##\s*/, '').replace(/\*\*/g, '');
        return `log();\nlog(bright + white + '${escape(title)}' + reset);`;
      }
      if (trimmed.startsWith('- ')) {
        return `log('    ' + green + '\\u2022 ' + reset + white + '${escape(trimmed.slice(2))}' + reset);`;
      }
      if (trimmed) {
        return `log(white + '  ${escape(l)}' + reset);`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n') || `log(gray + '暂无内容' + reset);`;
}

/** markdown: 粗体 **text** 和列表 - item */
function renderMarkdown(lines: string[]): string {
  return lines
    .map((l) => {
      const trimmed = l.trim();
      if (!trimmed) return `log();`;
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return `log(bright + white + '${escape(trimmed.slice(2, -2))}' + reset);`;
      }
      if (trimmed.startsWith('- ')) {
        return `log('  ' + green + '\\u2022 ' + reset + white + '${escape(trimmed.slice(2))}' + reset);`;
      }
      return `log(white + '${escape(l)}' + reset);`;
    })
    .join('\n') || `log(gray + '暂无内容' + reset);`;
}

function buildCase(templateType: TemplateType, cmdName: string, content: string): string {
  const lines = content.split('\n');

  let body: string;
  switch (templateType) {
    case 'keyvalue':
      body = renderKeyValue(lines);
      break;
    case 'list':
      body = renderList(lines);
      break;
    case 'grouplist':
      body = renderGroupList(lines);
      break;
    case 'markdown':
      body = renderMarkdown(lines);
      break;
    case 'free':
    default:
      body = renderFree(lines);
  }

  return [
    `    case '${cmdName}':`,
    `      log();`,
    body,
    `      log();`,
    `      break;`,
  ].join('\n');
}

// ─── whoami: special, reads profile fields ────────────────────

function buildWhoamiCase(name: string, bio: string, location: string): string {
  const location2 = location || '未知';
  const bio2 = bio || '暂无简介';
  return [
    `    case 'whoami':`,
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

// ─── links: special, reads socialLinks ────────────────────────

function buildLinksCase(socialLinks: { platform: string; url: string }[]): string {
  if (socialLinks.length === 0) {
    return [
      `    case 'links':`,
      `      log();`,
      `      log(blue + '\\uD83D\\uDD17 链接' + reset);`,
      `      log('  暂无链接');`,
      `      log();`,
      `      break;`,
    ].join('\n');
  }
  const items = socialLinks
    .map((l) => `      log(gray + '  ' + reset + white + '${escape(l.platform + ':')}' + reset + cyan + ' ${escape(l.url)}' + reset);`)
    .join('\n');
  return [
    `    case 'links':`,
    `      log();`,
    `      log(blue + '\\uD83D\\uDD17 链接' + reset);`,
    items,
    `      log();`,
    `      break;`,
  ].join('\n');
}

// ─── Main generator ────────────────────────────────────────────

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function generatePackageJSON(profile: UserProfile, version = '1.0.1', readme = ''): string {
  return JSON.stringify(
    {
      name: `@vibeopc/${profile.username}`,
      version,
      description: `${profile.name} 的 CLI 名片 - ${profile.bio}`,
      readme,
      bin: {
        [profile.username]: './index.js',
      },
      files: ['index.js', 'README.md'],
      engines: { node: '>=16' },
      author: profile.name,
      license: 'MIT',
    },
    null,
    2
  );
}

export function generateIndex(profile: UserProfile): string {
  const { name, bio, location, commands, socialLinks } = profile;

  // Build command cases
  const cases = commands
    .map((cmd) => {
      if (cmd.name === 'whoami') {
        return buildWhoamiCase(name, bio, location);
      }
      if (cmd.name === 'links') {
        return buildLinksCase(socialLinks);
      }
      return buildCase(cmd.templateType, cmd.name, cmd.content || '');
    })
    .join('\n');

  // Menu items
  const menu = commands
    .map(
      (cmd) =>
        `    log(green + '  ${escape(cmd.name)}'.padEnd(12) + reset + gray + '${escape(cmd.description)}' + reset);`
    )
    .join('\n');

  // Help items
  const helpCmds = commands
    .map(
      (cmd) =>
        `  '${escape(cmd.name).padEnd(12)} ${escape(cmd.description)}'`
    )
    .join(',\n    ');

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
    `    log(gray + '\\u276F ' + reset);`,
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

export function generatePackage(profile: UserProfile, version?: string): Record<string, string> {
  const readme = generateREADME(profile);
  return {
    'package.json': generatePackageJSON(profile, version, readme),
    'index.js': generateIndex(profile),
    'README.md': readme,
  };
}

function generateREADME(profile: UserProfile): string {
  const lines: string[] = [
    `# ${profile.name}`,
    '',
    `${profile.bio || ''}`,
    profile.location ? `📍 ${profile.location}` : '',
    '',
    '---',
    '',
    '## 一条命令，了解我',
    '',
    '```bash',
    `npx @vibeopc/${profile.username}`,
    '```',
    '',
    '## 可用命令',
    '',
  ];

  for (const cmd of profile.commands) {
    lines.push(`### \`${cmd.name}\` — ${cmd.description}`);
    if (cmd.content && cmd.content.trim()) {
      lines.push('');
      lines.push('```');
      lines.push(cmd.content.trim());
      lines.push('```');
    }
    lines.push('');
  }

  if (profile.socialLinks.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 链接');
    lines.push('');
    for (const link of profile.socialLinks) {
      lines.push(`- [${link.platform}](${link.url})`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`> 由 [VibeOPC](https://vibeopc.app) 生成 · ${new Date().getFullYear()}`);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

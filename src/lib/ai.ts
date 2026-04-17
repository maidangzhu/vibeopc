import { TemplateType, UserProfile } from './types';

type FetchLike = typeof fetch;

interface DraftSocialLink {
  platform?: unknown;
  url?: unknown;
}

interface DraftCommand {
  name?: unknown;
  description?: unknown;
  templateType?: unknown;
  content?: unknown;
}

interface DraftPayload {
  name?: unknown;
  bio?: unknown;
  location?: unknown;
  socialLinks?: unknown;
  commands?: unknown;
}

export interface NormalizeResult {
  profile: UserProfile;
  warnings: string[];
  rawDraft: DraftPayload | null;
}

export interface GenerateProfileOptions {
  username: string;
  prompt: string;
  apiKey?: string;
  model?: string;
  fetchImpl?: FetchLike;
}

const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MAX_COMMANDS = 6;
const MAX_SOCIAL_LINKS = 6;
const SUPPORTED_TEMPLATE_TYPES: TemplateType[] = ['free', 'keyvalue', 'list', 'grouplist', 'markdown'];
const PREFERRED_COMMAND_EXAMPLES = ['whoami', 'about', 'projects', 'hobbies', 'links'];
const DEFAULT_LOCATION = '杭州';
const DEFAULT_COMMAND_DESCRIPTIONS: Record<string, string> = {
  whoami: '关于我',
  about: '关于我',
  projects: '项目',
  hobbies: '爱好',
  links: '链接',
  skills: '技能',
  stack: '技术栈',
  contact: '联系',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

function containsChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizePrompt(prompt: string): string {
  const normalized = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!normalized) return '通过 AI 生成的 CLI 名片';
  return truncate(normalized, 100);
}

function extractPromptHighlights(prompt: string): string[] {
  const segments = prompt
    .split(/[\n。！？!?,，；;]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 4);

  return segments.slice(0, 3);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeTemplateType(value: unknown): TemplateType {
  const raw = toTrimmedString(value).toLowerCase();
  if (!raw) return 'markdown';
  if (SUPPORTED_TEMPLATE_TYPES.includes(raw as TemplateType)) {
    return raw as TemplateType;
  }

  if (['kv', 'key-value', 'pairs', 'profile'].includes(raw)) return 'keyvalue';
  if (['bullet', 'bullets', 'items'].includes(raw)) return 'list';
  if (['group', 'grouped', 'groups'].includes(raw)) return 'grouplist';
  if (['section', 'sections', 'card', 'cards'].includes(raw)) return 'markdown';

  return 'markdown';
}

function inferCommandName(rawName: string, fallbackIndex: number): string {
  const source = rawName.toLowerCase();

  if (/(link|contact|social|wechat|github|twitter|xiaohongshu|bilibili|知乎)/i.test(rawName)) {
    return 'links';
  }
  if (/(project|作品|项目|case)/i.test(rawName)) {
    return 'projects';
  }
  if (/(hobby|hobbies|interest|fun|兴趣|爱好)/i.test(rawName)) {
    return 'hobbies';
  }
  if (/(skill|stack|能力|技术栈)/i.test(rawName)) {
    return 'skills';
  }
  if (/(about|bio|intro|介绍|关于我|whoami|who am i)/i.test(rawName)) {
    return 'about';
  }

  const sanitized = source
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);

  return sanitized || `cmd${fallbackIndex + 1}`;
}

function ensureUniqueCommandName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) return baseName;

  let suffix = 2;
  let candidate = `${baseName}${suffix}`.slice(0, 20);
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}${suffix}`.slice(0, 20);
  }

  return candidate;
}

function normalizeCommandDescription(commandName: string, rawDescription: unknown): string {
  const description = truncate(toTrimmedString(rawDescription), 24);
  if (containsChinese(description)) return description;
  return DEFAULT_COMMAND_DESCRIPTIONS[commandName] || description || '了解更多';
}

function buildContentGuidance(commandName: string, templateType: TemplateType): string {
  switch (templateType) {
    case 'list':
      return `${commandName} 的 content 请尽量拆成多行，每行一个条目，不要挤成一句话。`;
    case 'grouplist':
      return `${commandName} 的 content 请按分组写，多行输出，小项用 "- " 开头。`;
    case 'markdown':
      return `${commandName} 的 content 请用简洁中文分段；如果有列表项，用 "- " 开头。`;
    case 'keyvalue':
      return `${commandName} 的 content 请优先使用“字段: 值”的多行格式。`;
    case 'free':
    default:
      return `${commandName} 的 content 保持简洁，必要时换行。`;
  }
}

function inferTemplateTypeHint(commandName: string): TemplateType {
  if (commandName === 'links') return 'keyvalue';
  if (commandName === 'projects' || commandName === 'hobbies') return 'list';
  if (commandName === 'about' || commandName === 'whoami') return 'keyvalue';
  return 'markdown';
}

function inferSocialPlatform(rawPlatform: string, url: string): string {
  const normalized = rawPlatform.toLowerCase();
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();

  if (normalized.includes('github') || host.includes('github.com')) return 'github';
  if (normalized.includes('twitter') || normalized === 'x' || host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
  if (normalized.includes('xiaohongshu') || normalized.includes('小红书') || host.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (normalized.includes('bilibili') || normalized.includes('b站') || host.includes('bilibili.com')) return 'bilibili';
  if (normalized.includes('zhihu') || normalized.includes('知乎') || host.includes('zhihu.com')) return 'zhihu';
  if (normalized.includes('juejin') || normalized.includes('掘金') || host.includes('juejin.cn')) return 'juejin';
  if (normalized.includes('website') || normalized.includes('site') || normalized.includes('官网')) return 'website';

  return normalized.replace(/\s+/g, '-') || 'website';
}

function buildFallbackCommands(
  prompt: string,
  profile: Pick<UserProfile, 'name' | 'bio' | 'location' | 'socialLinks'>
): UserProfile['commands'] {
  const highlights = extractPromptHighlights(prompt);
  const overviewContent = [
    `姓名: ${profile.name || '未命名用户'}`,
    `位置: ${profile.location || DEFAULT_LOCATION}`,
    `简介: ${profile.bio || '通过 AI 生成的 CLI 名片'}`,
  ].join('\n');

  const commands: UserProfile['commands'] = [
    {
      id: createId('cmd'),
      name: 'about',
      description: '关于我',
      templateType: 'keyvalue',
      content: overviewContent,
    },
    {
      id: createId('cmd'),
      name: 'highlights',
      description: '重点信息',
      templateType: 'list',
      content:
        highlights.length > 0
          ? highlights.join('\n')
          : '暂无更多信息，请在编辑区补充你的经历、项目或擅长方向。',
    },
  ];

  if (profile.socialLinks.length > 0) {
    commands.push({
      id: createId('cmd'),
      name: 'links',
      description: '链接',
      templateType: 'keyvalue',
      content: '',
    });
  }

  return commands;
}

export function extractFirstJsonObject(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    const fencedCandidate = fencedMatch[1].trim();
    return JSON.parse(fencedCandidate);
  }

  let inString = false;
  let escapeNext = false;
  let depth = 0;
  let start = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, index + 1);
        return JSON.parse(candidate);
      }
    }
  }

  throw new Error('Moonshot did not return a JSON object');
}

function readContentFromMoonshot(messageContent: unknown): string {
  if (typeof messageContent === 'string') return messageContent;

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => {
        if (typeof part === 'string') return part;
        if (isRecord(part) && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function buildMoonshotMessages(prompt: string) {
  return [
    {
      role: 'system',
      content: [
        '你是一个 CLI 名片生成器。',
        '请根据用户输入，生成一个 JSON 对象，不要输出额外解释，不要使用 Markdown 代码块。',
        'JSON 顶层字段只允许: name, bio, location, socialLinks, commands。',
        'socialLinks 为数组，每项包含 platform, url。',
        'commands 为数组，每项包含 name, description, templateType, content。',
        `name 必须是简洁的 CLI 英文命令名，只能使用小写字母和数字，不要空格，不要连字符，不要下划线。优先使用这类短命令: ${PREFERRED_COMMAND_EXAMPLES.join('/')}。`,
        'description 必须使用简短中文，例如：关于我、项目、爱好、链接。',
        'templateType 只能是 free, keyvalue, list, grouplist, markdown 之一。',
        '命令数量控制在 3 到 5 个之间。',
        '内容默认使用中文并保持简洁，content 只保留最关键的信息。',
        '适合罗列的信息请拆成多行，不要只写一句话。',
        buildContentGuidance('about / whoami', inferTemplateTypeHint('about')),
        buildContentGuidance('projects', inferTemplateTypeHint('projects')),
        buildContentGuidance('hobbies', inferTemplateTypeHint('hobbies')),
        buildContentGuidance('links', inferTemplateTypeHint('links')),
      ].join('\n'),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];
}

export async function requestMoonshotDraft({
  prompt,
  apiKey,
  model,
  fetchImpl = fetch,
}: Omit<GenerateProfileOptions, 'username'>): Promise<{ rawText: string; model: string }> {
  const resolvedApiKey = apiKey || process.env.MOONSHOT_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('MOONSHOT_API_KEY is not set');
  }

  const resolvedModel = model || process.env.MOONSHOT_MODEL || 'moonshot-v1-8k';
  const response = await fetchImpl(MOONSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resolvedApiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: buildMoonshotMessages(prompt),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Moonshot request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };

  const rawText = readContentFromMoonshot(payload.choices?.[0]?.message?.content);
  if (!rawText) {
    throw new Error('Moonshot response did not contain any content');
  }

  return { rawText, model: resolvedModel };
}

export function normalizeGeneratedDraft(
  draft: unknown,
  options: { username: string; prompt: string }
): NormalizeResult {
  const warnings: string[] = [];
  const rawDraft = isRecord(draft) ? (draft as DraftPayload) : null;

  if (!rawDraft) {
    warnings.push('模型未返回可解析的对象，已使用规则生成基础 CLI。');
  }

  const name = truncate(toTrimmedString(rawDraft?.name), 40) || options.username || '未命名用户';
  const bio = truncate(toTrimmedString(rawDraft?.bio), 100) || summarizePrompt(options.prompt);
  const location = truncate(toTrimmedString(rawDraft?.location), 40) || DEFAULT_LOCATION;

  const socialLinks = Array.isArray(rawDraft?.socialLinks)
    ? rawDraft.socialLinks
        .slice(0, MAX_SOCIAL_LINKS)
        .map((entry) => {
          const item = isRecord(entry) ? (entry as DraftSocialLink) : null;
          const url = toTrimmedString(item?.url);
          if (!isValidHttpUrl(url)) return null;

          return {
            platform: inferSocialPlatform(toTrimmedString(item?.platform), url),
            url,
          };
        })
        .filter((entry): entry is UserProfile['socialLinks'][number] => Boolean(entry))
    : [];

  const socialLinkMap = new Map<string, UserProfile['socialLinks'][number]>();
  socialLinks.forEach((link) => {
    if (!socialLinkMap.has(link.url)) {
      socialLinkMap.set(link.url, link);
    }
  });
  const dedupedSocialLinks = Array.from(socialLinkMap.values());

  const rawCommands = Array.isArray(rawDraft?.commands) ? rawDraft.commands.slice(0, MAX_COMMANDS) : [];
  const usedNames = new Set<string>();
  const commands: UserProfile['commands'] = rawCommands
    .map((entry, index) => {
      const item = isRecord(entry) ? (entry as DraftCommand) : null;
      const seedText = [toTrimmedString(item?.name), toTrimmedString(item?.description), toTrimmedString(item?.content)]
        .filter(Boolean)
        .join(' ');
      const inferredName = inferCommandName(seedText, index);
      const nameCandidate = ensureUniqueCommandName(inferredName, usedNames);
      usedNames.add(nameCandidate);

      const description = normalizeCommandDescription(nameCandidate, item?.description);
      const content = truncate(toTrimmedString(item?.content), 1600);

      if (!content && nameCandidate !== 'links') {
        warnings.push(`命令 ${nameCandidate} 缺少内容，已使用默认占位文本。`);
      }

      return {
        id: createId('cmd'),
        name: nameCandidate,
        description,
        templateType: normalizeTemplateType(item?.templateType),
        content: content || (nameCandidate === 'links' ? '' : '暂无内容，欢迎在编辑区继续补充。'),
      };
    })
    .filter((command) => Boolean(command.name));

  let finalCommands: UserProfile['commands'] = commands;
  if (finalCommands.length === 0) {
    warnings.push('模型没有生成有效命令，已自动补全基础命令。');
    finalCommands = buildFallbackCommands(options.prompt, {
      name,
      bio,
      location,
      socialLinks: dedupedSocialLinks,
    });
  }

  if (dedupedSocialLinks.length > 0 && !finalCommands.some((command) => command.name === 'links')) {
    const linksCommand: UserProfile['commands'][number] = {
      id: createId('cmd'),
      name: 'links',
      description: '链接',
      templateType: 'keyvalue',
      content: '',
    };

    finalCommands = [
      ...finalCommands,
      linksCommand,
    ].slice(0, MAX_COMMANDS);
    warnings.push('已自动补充 links 命令，确保社交链接能在 CLI 中显示。');
  }

  return {
    rawDraft,
    warnings,
    profile: {
      username: options.username,
      name,
      bio,
      location,
      avatarUrl: '',
      templateId: 'personal',
      socialLinks: dedupedSocialLinks,
      commands: finalCommands,
    },
  };
}

export async function generateProfileFromPrompt(
  options: GenerateProfileOptions
): Promise<NormalizeResult & { rawText: string; model: string }> {
  const { rawText, model } = await requestMoonshotDraft(options);
  let draft: unknown;

  try {
    draft = extractFirstJsonObject(rawText);
  } catch {
    draft = null;
  }

  const normalized = normalizeGeneratedDraft(draft, {
    username: options.username,
    prompt: options.prompt,
  });

  if (!normalized.rawDraft) {
    normalized.warnings.unshift('模型响应未通过 JSON 解析，已回退到规则生成。');
  }

  return {
    ...normalized,
    rawText,
    model,
  };
}

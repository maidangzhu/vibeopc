export interface SocialLink {
  platform: string;
  url: string;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  content: string;
  /** 控制终端渲染格式 */
  templateType: TemplateType;
}

/** 终端渲染模式 */
export type TemplateType =
  /** 自由文本，原样输出 */
  | 'free'
  /** 键值对列表：label: value */
  | 'keyvalue'
  /** 简单列表，每行一个条目 */
  | 'list'
  /** 分组列表，支持多级标题 */
  | 'grouplist'
  /** Markdown 样式：标题 + 粗体 + 列表 */
  | 'markdown';

export interface Template {
  id: string;
  name: string;
  description: string;
  /** 适用人群 */
  audience: string;
  commands: Omit<Command, 'id'>[];
}

export interface UserProfile {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  location: string;
  socialLinks: SocialLink[];
  commands: Command[];
  /** 当前使用的模板 ID */
  templateId?: string;
}

export const DEFAULT_COMMANDS: Command[] = [
  {
    id: '1',
    name: 'whoami',
    description: '关于我',
    content: '',
    templateType: 'keyvalue',
  },
  {
    id: '2',
    name: 'skills',
    description: '我的技能',
    content: '🛠 技术栈\n  - React / Vue / Next.js\n  - Node.js / Python\n  - AI 开发\n\n📚 正在学习\n  - AI Agent 开发\n  - MCP 协议\n\n💡 兴趣\n  - 产品设计\n  - 独立开发',
    templateType: 'grouplist',
  },
  {
    id: '3',
    name: 'projects',
    description: '我的项目',
    content: '暂无项目（期待中...）',
    templateType: 'list',
  },
  {
    id: '4',
    name: 'links',
    description: '链接',
    content: '',
    templateType: 'keyvalue',
  },
];

export const SOCIAL_PLATFORMS = [
  { value: 'github', label: 'GitHub' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: 'Bilibili' },
  { value: 'zhihu', label: '知乎' },
  { value: 'juejin', label: '掘金' },
  { value: 'website', label: '个人网站' },
];

export function getSocialPlatformLabel(platform: string): string {
  const normalized = platform.trim().toLowerCase();
  const matched = SOCIAL_PLATFORMS.find(
    (item) => item.value === normalized || item.label.toLowerCase() === normalized
  );

  return matched?.label || platform;
}

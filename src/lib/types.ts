export interface SocialLink {
  platform: string;
  url: string;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  content: string;
}

export interface UserProfile {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  location: string;
  socialLinks: SocialLink[];
  commands: Command[];
}

export const DEFAULT_COMMANDS: Command[] = [
  {
    id: '1',
    name: 'whoami',
    description: '关于我',
    content: '',
  },
  {
    id: '2',
    name: 'skills',
    description: '我的技能',
    content: '🛠 技术栈\n  - React / Vue / Next.js\n  - Node.js / Python\n  - AI 开发\n\n📚 正在学习\n  - AI Agent 开发\n  - MCP 协议\n\n💡 兴趣\n  - 产品设计\n  - 独立开发',
  },
  {
    id: '3',
    name: 'projects',
    description: '我的项目',
    content: '暂无项目（期待中...）',
  },
  {
    id: '4',
    name: 'links',
    description: '链接',
    content: '',
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

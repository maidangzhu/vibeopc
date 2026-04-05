import { Template, Command } from './types';

function cmd(overrides: Partial<Omit<Command, 'id'>>, index: number): Omit<Command, 'id'> {
  return {
    name: 'item',
    description: '项目',
    content: '',
    templateType: 'list',
    ...overrides,
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 'personal',
    name: '个人名片',
    description: '简洁的个人介绍，适合所有人',
    audience: '通用',
    commands: [
      cmd({ name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'skills', description: '我的技能', content: '🛠 技术栈\n  - React / Vue / Next.js\n  - Node.js / Python\n\n📚 正在学习\n  - AI 开发\n  - MCP 协议', templateType: 'grouplist' }, 1),
      cmd({ name: 'projects', description: '我的项目', content: '暂无项目（期待中...）', templateType: 'list' }, 2),
      cmd({ name: 'links', description: '链接', content: '', templateType: 'keyvalue' }, 3),
    ],
  },
  {
    id: 'developer',
    name: '开发者',
    description: '面向技术人群，展示技能栈和开源项目',
    audience: '工程师 / 独立开发者',
    commands: [
      cmd({ name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'stack', description: '技术栈', content: '**前端**\n  React · Next.js · Vue\n\n**后端**\n  Node.js · Python · Go\n\n**数据库**\n  PostgreSQL · Redis · MongoDB\n\n**DevOps**\n  Docker · K8s · CI/CD', templateType: 'markdown' }, 1),
      cmd({ name: 'projects', description: '开源项目', content: '暂无开源项目', templateType: 'list' }, 2),
      cmd({ name: 'oss', description: '贡献记录', content: '暂无贡献记录', templateType: 'markdown' }, 3),
      cmd({ name: 'links', description: '链接', content: '', templateType: 'keyvalue' }, 4),
    ],
  },
  {
    id: 'creator',
    name: '创作者',
    description: '展示作品和合作方式，适合博主/KOL',
    audience: '内容创作者 / KOL',
    commands: [
      cmd({ name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'works', description: '我的作品', content: '暂无作品（期待中...）', templateType: 'list' }, 1),
      cmd({ name: 'stats', description: '数据概览', content: '暂无统计数据', templateType: 'keyvalue' }, 2),
      cmd({ name: 'collab', description: '合作方式', content: '暂无合作说明', templateType: 'markdown' }, 3),
      cmd({ name: 'links', description: '关注我', content: '', templateType: 'keyvalue' }, 4),
    ],
  },
  {
    id: 'founder',
    name: '创业者',
    description: '展示产品和团队，适合创业者',
    audience: '创始人 / 创业团队',
    commands: [
      cmd({ name: 'whoami', description: '我是谁', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'product', description: '我们在做什么', content: '暂无产品介绍', templateType: 'markdown' }, 1),
      cmd({ name: 'team', description: '团队成员', content: '暂无团队信息', templateType: 'list' }, 2),
      cmd({ name: 'mission', description: '使命愿景', content: '暂无使命宣言', templateType: 'markdown' }, 3),
      cmd({ name: 'contact', description: '联系我们', content: '', templateType: 'keyvalue' }, 4),
    ],
  },
  {
    id: 'minimal',
    name: '极简',
    description: '只展示最核心的信息，干净利落',
    audience: '极简主义者',
    commands: [
      cmd({ name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'links', description: '链接', content: '', templateType: 'keyvalue' }, 1),
    ],
  },
  {
    id: 'resume',
    name: '简历',
    description: '结构化展示经历、技能和项目，适合求职',
    audience: '求职者',
    commands: [
      cmd({ name: 'whoami', description: '基本信息', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'experience', description: '工作经历', content: '暂无工作经历', templateType: 'markdown' }, 1),
      cmd({ name: 'skills', description: '技能特长', content: '暂无技能介绍', templateType: 'grouplist' }, 2),
      cmd({ name: 'projects', description: '项目经验', content: '暂无项目经验', templateType: 'markdown' }, 3),
      cmd({ name: 'education', description: '教育背景', content: '暂无教育背景', templateType: 'list' }, 4),
      cmd({ name: 'contact', description: '联系方式', content: '', templateType: 'keyvalue' }, 5),
    ],
  },
  {
    id: 'oss',
    name: '开源作者',
    description: '面向开源社区，展示仓库和贡献',
    audience: '开源贡献者 / 维护者',
    commands: [
      cmd({ name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'repos', description: '我的仓库', content: '暂无公开仓库', templateType: 'list' }, 1),
      cmd({ name: 'stars', description: '累计 Stars', content: '暂无 Star 数据', templateType: 'keyvalue' }, 2),
      cmd({ name: 'contrib', description: '贡献记录', content: '暂无贡献记录', templateType: 'list' }, 3),
      cmd({ name: 'links', description: '链接', content: '', templateType: 'keyvalue' }, 4),
    ],
  },
  {
    id: 'student',
    name: '学生',
    description: '展示学习经历、兴趣和联系方式',
    audience: '在校学生 / 求职者',
    commands: [
      cmd({ name: 'whoami', description: '关于我', content: '', templateType: 'keyvalue' }, 0),
      cmd({ name: 'study', description: '学习方向', content: '暂无学习方向', templateType: 'grouplist' }, 1),
      cmd({ name: 'projects', description: '课程项目', content: '暂无项目经验', templateType: 'list' }, 2),
      cmd({ name: 'interest', description: '兴趣爱好', content: '暂无兴趣爱好', templateType: 'list' }, 3),
      cmd({ name: 'contact', description: '联系方式', content: '', templateType: 'keyvalue' }, 4),
    ],
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function applyTemplate(template: Template, overrides: Record<string, string> = {}): Command[] {
  return template.commands.map((cmd, i) => ({
    ...cmd,
    id: `${Date.now()}-${i}`,
    content: overrides[cmd.name] ?? cmd.content,
  }));
}

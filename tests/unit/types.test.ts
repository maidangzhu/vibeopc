import { DEFAULT_COMMANDS, SOCIAL_PLATFORMS, UserProfile, Command } from '@/lib/types';

describe('types', () => {
  describe('DEFAULT_COMMANDS', () => {
    it('默认包含 4 条命令', () => {
      expect(DEFAULT_COMMANDS).toHaveLength(4);
    });

    it('每条命令都有必需字段', () => {
      DEFAULT_COMMANDS.forEach((cmd) => {
        expect(typeof cmd.id).toBe('string');
        expect(typeof cmd.name).toBe('string');
        expect(typeof cmd.description).toBe('string');
        expect(typeof cmd.content).toBe('string');
        expect(typeof cmd.templateType).toBe('string');
      });
    });

    it('包含 whoami、skills、projects、links 四个默认命令', () => {
      const names = DEFAULT_COMMANDS.map((c) => c.name);
      expect(names).toContain('whoami');
      expect(names).toContain('skills');
      expect(names).toContain('projects');
      expect(names).toContain('links');
    });

    it('skills 命令使用 grouplist 渲染模式', () => {
      const skills = DEFAULT_COMMANDS.find((c) => c.name === 'skills')!;
      expect(skills.templateType).toBe('grouplist');
    });

    it('所有命令 id 唯一', () => {
      const ids = DEFAULT_COMMANDS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('SOCIAL_PLATFORMS', () => {
    it('包含常用平台', () => {
      const values = SOCIAL_PLATFORMS.map((p) => p.value);
      expect(values).toContain('github');
      expect(values).toContain('twitter');
      expect(values).toContain('xiaohongshu');
      expect(values).toContain('bilibili');
    });

    it('每个平台有 value 和 label', () => {
      SOCIAL_PLATFORMS.forEach((p) => {
        expect(typeof p.value).toBe('string');
        expect(typeof p.label).toBe('string');
        expect(p.value.length).toBeGreaterThan(0);
        expect(p.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('UserProfile', () => {
    it('构造完整 profile 对象', () => {
      const profile: UserProfile = {
        username: 'test',
        name: 'Test',
        bio: 'Bio',
        avatarUrl: '',
        location: '北京',
        templateId: 'developer',
        socialLinks: [],
        commands: [],
      };
      expect(profile.username).toBe('test');
      expect(profile.templateId).toBe('developer');
    });
  });
});

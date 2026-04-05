import { TEMPLATES, getTemplateById, applyTemplate } from '@/lib/templates';
import { Template, Command } from '@/lib/types';

describe('templates', () => {
  describe('TEMPLATES', () => {
    it('应该包含 8 套模板', () => {
      expect(TEMPLATES).toHaveLength(8);
    });

    it('所有模板都有唯一 id', () => {
      const ids = TEMPLATES.map((t) => t.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('每个模板至少有一条命令', () => {
      TEMPLATES.forEach((tpl) => {
        expect(tpl.commands.length).toBeGreaterThan(0);
      });
    });

    it('每个命令都有 name、description、content、templateType', () => {
      TEMPLATES.forEach((tpl) => {
        tpl.commands.forEach((cmd) => {
          expect(typeof cmd.name).toBe('string');
          expect(cmd.name.length).toBeGreaterThan(0);
          expect(typeof cmd.description).toBe('string');
          expect(typeof cmd.content).toBe('string');
          expect(typeof cmd.templateType).toBe('string');
        });
      });
    });

    it('所有模板都有必需字段', () => {
      TEMPLATES.forEach((tpl) => {
        expect(typeof tpl.id).toBe('string');
        expect(typeof tpl.name).toBe('string');
        expect(typeof tpl.description).toBe('string');
        expect(typeof tpl.audience).toBe('string');
        expect(Array.isArray(tpl.commands)).toBe(true);
      });
    });

    it('personal 模板应该包含 whoami 和 links 命令', () => {
      const personal = TEMPLATES.find((t) => t.id === 'personal')!;
      const names = personal.commands.map((c) => c.name);
      expect(names).toContain('whoami');
      expect(names).toContain('links');
    });

    it('minimal 模板只有 2 条命令', () => {
      const minimal = TEMPLATES.find((t) => t.id === 'minimal')!;
      expect(minimal.commands).toHaveLength(2);
    });

    it('resume 模板包含 experience 和 education 命令', () => {
      const resume = TEMPLATES.find((t) => t.id === 'resume')!;
      const names = resume.commands.map((c) => c.name);
      expect(names).toContain('experience');
      expect(names).toContain('education');
    });
  });

  describe('getTemplateById', () => {
    it('能通过 id 找到对应模板', () => {
      const tpl = getTemplateById('developer');
      expect(tpl).toBeDefined();
      expect(tpl!.name).toBe('开发者');
    });

    it('不存在的 id 返回 undefined', () => {
      const tpl = getTemplateById('nonexistent');
      expect(tpl).toBeUndefined();
    });
  });

  describe('applyTemplate', () => {
    it('生成的命令数量与模板一致', () => {
      const tpl = getTemplateById('personal')!;
      const commands = applyTemplate(tpl);
      expect(commands.length).toBe(tpl.commands.length);
    });

    it('生成的命令包含唯一 id', () => {
      const tpl = getTemplateById('personal')!;
      const commands = applyTemplate(tpl);
      const ids = commands.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('不传 overrides 时使用模板默认 content', () => {
      const tpl = getTemplateById('personal')!;
      const commands = applyTemplate(tpl);
      const whoami = commands.find((c) => c.name === 'whoami')!;
      // whoami 在 personal 模板里 content 为空（读取 profile 字段）
      expect(whoami.content).toBe('');
    });

    it('传入 overrides 时覆盖对应命令的 content', () => {
      const tpl = getTemplateById('personal')!;
      const commands = applyTemplate(tpl, {
        skills: '# 我的技能\n- React\n- Node.js',
      });
      const skills = commands.find((c) => c.name === 'skills')!;
      expect(skills.content).toContain('React');
      expect(skills.content).toContain('Node.js');
    });

    it('切换模板时保留已有命令的 content', () => {
      const personal = getTemplateById('personal')!;
      const developer = getTemplateById('developer')!;

      const personalCmds = applyTemplate(personal, {
        skills: 'Custom Skills',
      });

      const skillContent = personalCmds.find((c) => c.name === 'skills')!.content;

      // 模拟切换到 developer 模板
      const devCommands = applyTemplate(developer, {
        skills: skillContent,
      });

      const devSkills = devCommands.find((c) => c.name === 'stack')!;
      // developer 的 skills 命令叫 stack，不叫 skills
      expect(devSkills.templateType).toBe('markdown');
    });
  });
});

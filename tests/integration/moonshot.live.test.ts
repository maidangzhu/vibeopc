import { generateProfileFromPrompt } from '@/lib/ai';

const maybeDescribe = process.env.MOONSHOT_API_KEY ? describe : describe.skip;

maybeDescribe('Moonshot live generation', () => {
  it(
    '用真实模型生成并返回稳定的 CLI 草稿',
    async () => {
      const result = await generateProfileFromPrompt({
        username: 'live-demo',
        prompt: [
          '我是麦当，独立开发者，主要做 AI 工具和内容产品。',
          '希望命令里能展示项目、技能、合作方式和联系方式。',
          'GitHub: https://github.com/maidang',
          'Twitter: https://twitter.com/maidang',
        ].join('\n'),
      });

      expect(result.profile.username).toBe('live-demo');
      expect(result.profile.name.length).toBeGreaterThan(0);
      expect(result.profile.commands.length).toBeGreaterThan(0);
      expect(result.profile.commands.length).toBeLessThanOrEqual(6);
      expect(result.profile.commands.some((command) => command.name === 'links')).toBe(true);
    },
    60000
  );
});

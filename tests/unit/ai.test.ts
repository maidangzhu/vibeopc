import {
  extractFirstJsonObject,
  generateProfileFromPrompt,
  normalizeGeneratedDraft,
} from '@/lib/ai';

describe('extractFirstJsonObject', () => {
  it('支持从 code fence 中提取 JSON', () => {
    const parsed = extractFirstJsonObject('```json\n{"name":"麦当"}\n```') as { name: string };
    expect(parsed.name).toBe('麦当');
  });

  it('支持从普通文本中提取 JSON', () => {
    const parsed = extractFirstJsonObject('这是结果 {"name":"麦当","commands":[]} 请查收') as { name: string };
    expect(parsed.name).toBe('麦当');
  });
});

describe('normalizeGeneratedDraft', () => {
  it('会清洗无效字段、补充 links 命令并去重', () => {
    const result = normalizeGeneratedDraft(
      {
        name: '  麦当  ',
        bio: '独立开发者，正在做 AI 工具和内容产品。',
        avatarUrl: 'not-a-url',
        socialLinks: [
          { platform: 'GitHub', url: 'https://github.com/maidang' },
          { platform: 'GitHub', url: 'https://github.com/maidang' },
          { platform: '微博', url: 'bad-url' },
        ],
        commands: [
          {
            name: 'My Projects',
            description: 'Projects',
            templateType: 'sections',
            content: '项目 A\n项目 B',
          },
          {
            name: 'My Projects',
            description: '重复命令',
            templateType: 'list',
            content: '另一个项目',
          },
        ],
      },
      {
        username: 'maidang',
        prompt: '我是独立开发者，正在做 AI 工具和内容产品。',
      }
    );

    expect(result.profile.username).toBe('maidang');
    expect(result.profile.avatarUrl).toBe('');
    expect(result.profile.location).toBe('杭州');
    expect(result.profile.socialLinks).toEqual([
      { platform: 'github', url: 'https://github.com/maidang' },
    ]);
    expect(result.profile.commands.map((command) => command.name)).toContain('links');
    expect(result.profile.commands[0].name).toBe('projects');
    expect(result.profile.commands[1].name).not.toBe('projects');
    expect(result.profile.commands.every((command) => !command.name.includes('-'))).toBe(true);
    expect(result.profile.commands[0].description).toBe('项目');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('模型失效时会生成基础命令', () => {
    const result = normalizeGeneratedDraft(null, {
      username: 'demo',
      prompt: '我叫 Demo，在杭州做开发，想展示自己的经历和联系方式。',
    });

    expect(result.profile.commands.length).toBeGreaterThanOrEqual(2);
    expect(result.profile.commands[0].name).toBe('about');
    expect(result.warnings).toContain('模型未返回可解析的对象，已使用规则生成基础 CLI。');
  });
});

describe('generateProfileFromPrompt', () => {
  it('会调用 Moonshot 并返回规范化结果', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: '麦当',
                  bio: '独立开发者',
                  socialLinks: [{ platform: 'GitHub', url: 'https://github.com/maidang' }],
                  commands: [
                    {
                      name: 'projects',
                      description: '代表项目',
                      templateType: 'list',
                      content: 'VibeOPC\n另一个项目',
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await generateProfileFromPrompt({
      username: 'maidang',
      prompt: '我是麦当，独立开发者，想展示我的项目和链接。',
      apiKey: 'test-key',
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.profile.name).toBe('麦当');
    expect(result.profile.location).toBe('杭州');
    expect(result.profile.commands.map((command) => command.name)).toContain('projects');
    expect(result.profile.commands.map((command) => command.name)).toContain('links');
    expect(result.model).toBe('moonshot-v1-8k');

    const requestInit = fetchMock.mock.calls[0]?.[1];
    const payload = JSON.parse(String(requestInit?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(payload.messages[0].content).toContain('不要连字符');
    expect(payload.messages[0].content).toContain('description 必须使用简短中文');
    expect(payload.messages[0].content).toContain('whoami/about/projects/hobbies/links');
    expect(payload.messages[0].content).toContain('适合罗列的信息请拆成多行');
    expect(payload.messages[0].content).not.toContain('avatarUrl');
  });
});

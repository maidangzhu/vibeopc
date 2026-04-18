jest.mock('@/lib/ai', () => ({
  generateProfileFromPrompt: jest.fn(),
}));

import { POST } from '@/app/api/generate/route';
import { generateProfileFromPrompt } from '@/lib/ai';

const mockedGenerateProfileFromPrompt = generateProfileFromPrompt as jest.MockedFunction<typeof generateProfileFromPrompt>;

describe('POST /api/generate', () => {
  beforeEach(() => {
    mockedGenerateProfileFromPrompt.mockReset();
  });

  it('缺少 username 时返回 400', async () => {
    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'hello' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe(400);
    expect(data.message).toBe('用户名是必填项');
    expect(data.data).toBeNull();
  });

  it('缺少 prompt 时返回 400', async () => {
    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ username: 'maidang' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe(400);
    expect(data.message).toBe('请先输入你的资料');
    expect(data.data).toBeNull();
  });

  it('成功时返回规范化结果', async () => {
    mockedGenerateProfileFromPrompt.mockResolvedValue({
      profile: {
        username: 'maidang',
        name: '麦当',
        bio: '独立开发者',
        avatarUrl: '',
        location: '杭州',
        templateId: 'personal',
        socialLinks: [],
        commands: [
          {
            id: 'cmd-1',
            name: 'projects',
            description: '代表项目',
            templateType: 'list',
            content: 'VibeOPC',
          },
        ],
      },
      warnings: ['已自动补全基础字段'],
      rawDraft: {},
      rawText: '{"name":"麦当"}',
      model: 'moonshot-v1-8k',
    });

    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ username: 'maidang', prompt: '我是独立开发者，想展示项目。' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(0);
    expect(data.message).toBe('ok');
    expect(data.data.profile.name).toBe('麦当');
    expect(data.data.warnings).toEqual(['已自动补全基础字段']);
    expect(mockedGenerateProfileFromPrompt).toHaveBeenCalledWith({
      username: 'maidang',
      prompt: '我是独立开发者，想展示项目。',
    });
  });
});

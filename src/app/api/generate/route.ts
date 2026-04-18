import { generateProfileFromPrompt } from '@/lib/ai';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim().toLowerCase();
    const prompt = String(body.prompt || '').trim();

    if (!username) {
      return apiError('用户名是必填项', 400);
    }

    if (!/^[a-z0-9_-]+$/.test(username)) {
      return apiError('用户名只能包含小写字母、数字、下划线和连字符', 400);
    }

    if (!prompt) {
      return apiError('请先输入你的资料', 400);
    }

    const result = await generateProfileFromPrompt({ username, prompt });

    return apiSuccess({
      profile: result.profile,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('Generate profile error:', error);
    return apiError(error instanceof Error ? error.message : '生成失败，请稍后重试', 500);
  }
}

import { NextResponse } from 'next/server';
import { generateProfileFromPrompt } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim().toLowerCase();
    const prompt = String(body.prompt || '').trim();

    if (!username) {
      return NextResponse.json({ error: '用户名是必填项' }, { status: 400 });
    }

    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含小写字母、数字、下划线和连字符' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json({ error: '请先输入你的资料' }, { status: 400 });
    }

    const result = await generateProfileFromPrompt({ username, prompt });

    return NextResponse.json({
      success: true,
      profile: result.profile,
      warnings: result.warnings,
      model: result.model,
    });
  } catch (error) {
    console.error('Generate profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}

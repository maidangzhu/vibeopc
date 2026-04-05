import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePackage } from '@/lib/template';
import { checkPackageExists, publishToNpm } from '@/lib/npm';
import { UserProfile } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: '用户名是必填项' }, { status: 400 });
    }

    // 1. Read profile from database
    const dbProfile = await prisma.profile.findUnique({
      where: { username },
      include: {
        commands: { orderBy: { sortOrder: 'asc' } },
        socialLinks: true,
      },
    });

    if (!dbProfile) {
      return NextResponse.json(
        { error: '名片不存在，请先保存配置' },
        { status: 400 }
      );
    }

    // 2. Transform DB model to UserProfile for template
    const profile: UserProfile = {
      username: dbProfile.username,
      name: dbProfile.name,
      bio: dbProfile.bio,
      location: dbProfile.location,
      avatarUrl: dbProfile.avatarUrl,
      commands: dbProfile.commands.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        description: cmd.description,
        content: cmd.content,
      })),
      socialLinks: dbProfile.socialLinks.map((link) => ({
        platform: link.platform,
        url: link.url,
      })),
    };

    // 3. Check if package already exists (only if not already published)
    const packageName = `@vibeopc/${username}`;
    if (!dbProfile.npmPackage) {
      const exists = await checkPackageExists(packageName);
      if (exists) {
        return NextResponse.json(
          { error: '用户名已被占用，请尝试其他用户名' },
          { status: 400 }
        );
      }
    }

    // 4. Generate package files
    const files = generatePackage(profile);

    // 5. Publish to npm
    const npmToken = process.env.NPM_PUBLISH_TOKEN;
    if (!npmToken) {
      return NextResponse.json({ error: 'npm token 未配置' }, { status: 500 });
    }

    const result = await publishToNpm(files, {
      packageName,
      authToken: npmToken,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // 6. Update profile status in database
    await prisma.profile.update({
      where: { username },
      data: { npmPackage: packageName, status: 'published' },
    });

    return NextResponse.json({
      success: true,
      packageName,
      command: `npx ${packageName}`,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: '发布失败，请稍后重试' }, { status: 500 });
  }
}

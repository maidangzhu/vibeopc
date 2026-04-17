import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, bio, location, avatarUrl, commands, socialLinks, templateId, originalUsername } = body;
    const normalizedUsername = String(username || '').trim();
    const normalizedOriginalUsername = String(originalUsername || '').trim();

    if (!normalizedUsername || !name) {
      return NextResponse.json(
        { error: '用户名和姓名是必填项' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: '用户名只能包含小写字母、数字、下划线和连字符' },
        { status: 400 }
      );
    }

    if (normalizedOriginalUsername && normalizedOriginalUsername !== normalizedUsername) {
      return NextResponse.json(
        { error: '当前版本暂不支持修改用户名，请使用新用户名重新创建' },
        { status: 400 }
      );
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (existingProfile && normalizedOriginalUsername !== normalizedUsername) {
      return NextResponse.json(
        { error: '用户名已被占用，请换一个' },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const savedProfile = existingProfile
        ? await tx.profile.update({
            where: { username: normalizedUsername },
            data: {
              name,
              bio: bio || '',
              location: location || '',
              avatarUrl: avatarUrl || '',
              templateId: templateId || 'personal',
            },
          })
        : await tx.profile.create({
            data: {
              username: normalizedUsername,
              name,
              bio: bio || '',
              location: location || '',
              avatarUrl: avatarUrl || '',
              status: 'draft',
              templateId: templateId || 'personal',
            },
          });

      await tx.command.deleteMany({ where: { profileId: savedProfile.id } });
      await tx.socialLink.deleteMany({ where: { profileId: savedProfile.id } });

      if (commands && commands.length > 0) {
        await tx.command.createMany({
          data: commands.map((cmd: { name: string; description: string; content: string; templateType?: string }, i: number) => ({
            profileId: savedProfile.id,
            name: cmd.name,
            description: cmd.description || '',
            content: cmd.content || '',
            sortOrder: i,
            templateType: cmd.templateType || 'free',
          })),
        });
      }

      if (socialLinks && socialLinks.length > 0) {
        await tx.socialLink.createMany({
          data: socialLinks.map((link: { platform: string; url: string }) => ({
            profileId: savedProfile.id,
            platform: link.platform,
            url: link.url,
          })),
        });
      }
    });

    // Fetch updated profile with relations
    const updated = await prisma.profile.findUnique({
      where: { username: normalizedUsername },
      include: { commands: { orderBy: { sortOrder: 'asc' } }, socialLinks: true },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error('Profile save error:', error);
    return NextResponse.json(
      { error: '保存失败，请稍后重试' },
      { status: 500 }
    );
  }
}

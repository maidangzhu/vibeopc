import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, bio, location, avatarUrl, commands, socialLinks } = body;

    if (!username || !name) {
      return NextResponse.json(
        { error: '用户名和姓名是必填项' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含小写字母、数字、下划线和连字符' },
        { status: 400 }
      );
    }

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { username },
      update: {
        name,
        bio: bio || '',
        location: location || '',
        avatarUrl: avatarUrl || '',
      },
      create: {
        username,
        name,
        bio: bio || '',
        location: location || '',
        avatarUrl: avatarUrl || '',
        status: 'draft',
      },
    });

    // Delete old commands and social links
    await prisma.command.deleteMany({ where: { profileId: profile.id } });
    await prisma.socialLink.deleteMany({ where: { profileId: profile.id } });

    // Create commands
    if (commands && commands.length > 0) {
      await prisma.command.createMany({
        data: commands.map((cmd: { name: string; description: string; content: string }, i: number) => ({
          profileId: profile.id,
          name: cmd.name,
          description: cmd.description || '',
          content: cmd.content || '',
          sortOrder: i,
        })),
      });
    }

    // Create social links
    if (socialLinks && socialLinks.length > 0) {
      await prisma.socialLink.createMany({
        data: socialLinks.map((link: { platform: string; url: string }) => ({
          profileId: profile.id,
          platform: link.platform,
          url: link.url,
        })),
      });
    }

    // Fetch updated profile with relations
    const updated = await prisma.profile.findUnique({
      where: { username },
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

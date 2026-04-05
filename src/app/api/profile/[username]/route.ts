import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const profile = await prisma.profile.findUnique({
      where: { username },
      include: {
        commands: { orderBy: { sortOrder: 'asc' } },
        socialLinks: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: '名片不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}

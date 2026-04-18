import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';

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
      return apiError('名片不存在', 404);
    }

    return apiSuccess({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return apiError('获取失败', 500);
  }
}

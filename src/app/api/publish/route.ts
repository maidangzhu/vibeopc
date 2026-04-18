import { prisma } from '@/lib/db';
import { generatePackage } from '@/lib/template';
import { checkPackageExists, publishToNpm, getLatestVersion, incrementVersion } from '@/lib/npm';
import { UserProfile } from '@/lib/types';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return apiError('用户名是必填项', 400);
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
      return apiError('名片不存在，请先保存配置', 400);
    }

    // Transform DB model to UserProfile for template
    const profile: UserProfile = {
      username: dbProfile.username,
      name: dbProfile.name,
      bio: dbProfile.bio,
      location: dbProfile.location,
      avatarUrl: dbProfile.avatarUrl,
      templateId: dbProfile.templateId,
      commands: dbProfile.commands.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        description: cmd.description,
        content: cmd.content,
        templateType: (cmd.templateType as UserProfile['commands'][0]['templateType']) || 'free',
      })),
      socialLinks: dbProfile.socialLinks.map((link) => ({
        platform: link.platform,
        url: link.url,
      })),
    };

    // 3. Check if package already exists
    const packageName = `@vibeopc/${username}`;
    let version = '1.0.1';
    if (!dbProfile.npmPackage) {
      const exists = await checkPackageExists(packageName);
      if (exists) {
        return apiError('用户名已被占用，请尝试其他用户名', 400);
      }
    } else {
      // Package already published — increment version to avoid conflict
      const latest = await getLatestVersion(packageName);
      if (latest) {
        version = incrementVersion(latest);
      }
    }

    // 4. Generate package files with correct version
    const files = generatePackage(profile, version);

    // 5. Publish to npm
    const npmToken = process.env.NPM_PUBLISH_TOKEN;
    if (!npmToken) {
      return apiError('npm token 未配置', 500);
    }

    const result = await publishToNpm(files, {
      packageName,
      authToken: npmToken,
    });

    if (!result.success) {
      return apiError(result.message, 500);
    }

    // 6. Update profile status in database
    await prisma.profile.update({
      where: { username },
      data: { npmPackage: packageName, status: 'published' },
    });

    return apiSuccess({
      packageName,
      version,
      command: `npx ${packageName}`,
      npmUrl: `https://www.npmjs.com/package/${packageName}`,
    }, '发布成功');
  } catch (error) {
    console.error('Publish error:', error);
    return apiError('发布失败，请稍后重试', 500);
  }
}

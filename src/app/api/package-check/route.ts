import { after } from 'next/server';
import { prisma } from '@/lib/db';
import {
  isValidEmail,
  PACKAGE_CHECK_INTERVAL_MS,
  PACKAGE_CHECK_MAX_ATTEMPTS,
  processPackageCheckJob,
} from '@/lib/package-check';
import { apiError, apiSuccess } from '@/lib/api-response';

export const maxDuration = 300;

function isValidPackageName(value: string): boolean {
  return /^@[^/\s]+\/[^/\s]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const packageName = String(body.packageName || '').trim();
    const expectedVersion = String(body.expectedVersion || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!packageName || !expectedVersion || !email) {
      return apiError('packageName、expectedVersion 和 email 都是必填项', 400);
    }

    if (!isValidPackageName(packageName)) {
      return apiError('包名格式不正确', 400);
    }

    if (!isValidEmail(email)) {
      return apiError('邮箱格式不正确', 400);
    }

    const profile = await prisma.profile.findFirst({
      where: { npmPackage: packageName },
      select: { id: true, npmPackage: true },
    });

    if (!profile?.npmPackage) {
      return apiError('找不到对应的已发布名片', 404);
    }

    const existingJob = await prisma.packageCheckJob.findFirst({
      where: {
        profileId: profile.id,
        packageName,
        expectedVersion,
        email,
        status: { in: ['pending', 'checking', 'ready'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    if (existingJob?.status === 'ready') {
      return apiSuccess({
        jobId: existingJob.id,
        status: existingJob.status,
      }, '这个版本已经同步好了，你可以直接去运行命令。');
    }

    const activeJob =
      existingJob && ['pending', 'checking'].includes(existingJob.status) && existingJob.expiresAt > now
        ? existingJob
        : await prisma.packageCheckJob.create({
            data: {
              profileId: profile.id,
              packageName,
              expectedVersion,
              email,
              status: 'pending',
              attempts: 0,
              maxAttempts: PACKAGE_CHECK_MAX_ATTEMPTS,
              lastError: '',
              sandboxId: '',
              expiresAt: new Date(now.getTime() + PACKAGE_CHECK_INTERVAL_MS * PACKAGE_CHECK_MAX_ATTEMPTS),
            },
          });

    if (activeJob.status === 'pending') {
      after(async () => {
        await processPackageCheckJob(activeJob.id);
      });
    }

    return apiSuccess({
      jobId: activeJob.id,
      status: activeJob.status,
    }, activeJob.status === 'checking'
      ? '这个邮箱的检查任务已经在运行中了。同步完成后会发邮件通知你。'
      : '已开始检查 npm 同步状态。同步完成后会发邮件通知你。');
  } catch (error) {
    console.error('Package check create error:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2021'
    ) {
      return apiError('数据库还没有完成最新迁移，请先执行 Prisma migration', 503);
    }

    return apiError('创建检查任务失败，请稍后重试', 500);
  }
}

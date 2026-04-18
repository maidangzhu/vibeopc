import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { cleanupInactiveSandboxes } from '@/lib/sandbox-cleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorizedRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return apiError('CRON_SECRET is not set', 500);
  }

  if (!isAuthorizedRequest(request)) {
    return apiError('Unauthorized', 401);
  }

  try {
    const cleanupResult = await cleanupInactiveSandboxes();

    let updatedJobs = 0;
    if (cleanupResult.cleanedSandboxIds.length > 0) {
      const result = await prisma.packageCheckJob.updateMany({
        where: {
          sandboxId: { in: cleanupResult.cleanedSandboxIds },
          status: { in: ['pending', 'checking'] },
        },
        data: {
          status: 'failed',
          lastError: 'Sandbox cleaned by scheduled cleanup cron',
        },
      });
      updatedJobs = result.count;
    }

    return apiSuccess(
      {
        ...cleanupResult,
        updatedJobs,
      },
      cleanupResult.failed > 0 ? 'Sandbox cleanup finished with partial failures' : 'Sandbox cleanup finished'
    );
  } catch (error) {
    console.error('Cron sandbox cleanup failed:', error);
    return apiError(error instanceof Error ? error.message : 'Sandbox cleanup failed', 500);
  }
}

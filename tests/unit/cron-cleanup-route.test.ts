const cleanupInactiveSandboxes = jest.fn();
const updateMany = jest.fn();

jest.mock('@/lib/sandbox-cleanup', () => ({
  cleanupInactiveSandboxes,
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    packageCheckJob: {
      updateMany,
    },
  },
}));

import { GET } from '@/app/api/cron/cleanup-sandboxes/route';

describe('GET /api/cron/cleanup-sandboxes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'secret_test',
    };
    cleanupInactiveSandboxes.mockReset();
    updateMany.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('缺少鉴权时返回 401', async () => {
    const response = await GET(new Request('http://localhost/api/cron/cleanup-sandboxes'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe(401);
    expect(cleanupInactiveSandboxes).not.toHaveBeenCalled();
  });

  it('会执行清理并回写 package check job', async () => {
    cleanupInactiveSandboxes.mockResolvedValue({
      projectId: 'project_1',
      scanned: 5,
      stopped: 2,
      staleCandidates: 2,
      cleaned: 2,
      failed: 0,
      staleGraceMs: 3600000,
      cleanedSandboxIds: ['sandbox_1', 'sandbox_2'],
      failedSandboxIds: [],
    });
    updateMany.mockResolvedValue({ count: 1 });

    const response = await GET(
      new Request('http://localhost/api/cron/cleanup-sandboxes', {
        headers: {
          Authorization: 'Bearer secret_test',
        },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(0);
    expect(data.data.cleaned).toBe(2);
    expect(data.data.updatedJobs).toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        sandboxId: { in: ['sandbox_1', 'sandbox_2'] },
        status: { in: ['pending', 'checking'] },
      },
      data: {
        status: 'failed',
        lastError: 'Sandbox cleaned by scheduled cleanup cron',
      },
    });
  });
});

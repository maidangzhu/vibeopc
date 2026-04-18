import {
  cleanupInactiveSandboxes,
  isInactiveSandbox,
} from '@/lib/sandbox-cleanup';

describe('sandbox cleanup', () => {
  it('会识别超时的 running sandbox', () => {
    const now = new Date('2026-04-18T12:00:00.000Z').getTime();

    expect(
      isInactiveSandbox(
        {
          id: 'sandbox_1',
          status: 'running',
          createdAt: now - 10 * 60 * 1000,
          updatedAt: now - 5 * 60 * 1000,
          startedAt: now - 10 * 60 * 1000,
          timeout: 5 * 60 * 1000,
        },
        now,
        60 * 60 * 1000
      )
    ).toBe(true);
  });

  it('不会把新鲜的 running sandbox 误判成 inactive', () => {
    const now = new Date('2026-04-18T12:00:00.000Z').getTime();

    expect(
      isInactiveSandbox(
        {
          id: 'sandbox_2',
          status: 'running',
          createdAt: now - 5 * 60 * 1000,
          updatedAt: now - 2 * 60 * 1000,
          startedAt: now - 5 * 60 * 1000,
          timeout: 30 * 60 * 1000,
        },
        now,
        60 * 60 * 1000
      )
    ).toBe(false);
  });

  it('会清理 stale active sandboxes，并统计 stopped 数量', async () => {
    const stop = jest.fn().mockResolvedValue(undefined);
    const listSandboxes = jest.fn().mockResolvedValue({
      sandboxes: [
        {
          id: 'sandbox_running_stale',
          status: 'running',
          createdAt: 1000,
          updatedAt: 2000,
          startedAt: 1000,
          timeout: 1000,
        },
        {
          id: 'sandbox_pending_stale',
          status: 'pending',
          createdAt: 1000,
          updatedAt: 2000,
          timeout: 30_000,
        },
        {
          id: 'sandbox_stopped',
          status: 'stopped',
          createdAt: 1000,
          updatedAt: 2000,
          timeout: 30_000,
        },
      ],
    });
    const getSandbox = jest.fn().mockResolvedValue({ stop });

    const result = await cleanupInactiveSandboxes({
      projectId: 'project_1',
      now: 10_000,
      staleGraceMs: 1000,
      listSandboxes,
      getSandbox,
    });

    expect(result.projectId).toBe('project_1');
    expect(result.scanned).toBe(3);
    expect(result.stopped).toBe(1);
    expect(result.staleCandidates).toBe(2);
    expect(result.cleaned).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.cleanedSandboxIds).toEqual([
      'sandbox_running_stale',
      'sandbox_pending_stale',
    ]);
    expect(getSandbox).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledWith({ blocking: true });
  });
});

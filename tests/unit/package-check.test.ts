jest.mock('@/lib/db', () => ({
  prisma: {
    packageCheckJob: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import {
  checkPackageAvailability,
  processPackageCheckJob,
  waitForPackageAvailabilityWithSandbox,
} from '@/lib/package-check';

function createJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

function createTextResponse(status: number, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  };
}

describe('checkPackageAvailability', () => {
  it('版本和 tarball 都可访问时返回 ready', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          versions: {
            '1.0.1': {
              dist: { tarball: 'https://registry.npmjs.org/test/-/test-1.0.1.tgz' },
            },
          },
        })
      )
      .mockResolvedValueOnce(createTextResponse(200));

    const result = await checkPackageAvailability('@vibeopc/test', '1.0.1', fetchImpl as typeof fetch);

    expect(result.ready).toBe(true);
    expect(result.versionFound).toBe(true);
    expect(result.tarballReachable).toBe(true);
    expect(result.tarballUrl).toContain('test-1.0.1.tgz');
  });

  it('版本还没同步出来时返回 not ready', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createJsonResponse(200, {
        versions: {},
      })
    );

    const result = await checkPackageAvailability('@vibeopc/test', '1.0.2', fetchImpl as typeof fetch);

    expect(result.ready).toBe(false);
    expect(result.versionFound).toBe(false);
    expect(result.error).toContain('1.0.2');
  });
});

describe('waitForPackageAvailabilityWithSandbox', () => {
  it('会轮询直到包可用后停止 sandbox', async () => {
    const writeFiles = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const sleepImpl = jest.fn().mockResolvedValue(undefined);
    const onAttempt = jest.fn();

    const outputs = [
      JSON.stringify({
        ready: false,
        versionFound: false,
        tarballReachable: false,
        resolvedVersion: null,
        tarballUrl: null,
        error: 'not ready',
      }),
      JSON.stringify({
        ready: true,
        versionFound: true,
        tarballReachable: true,
        resolvedVersion: '1.0.1',
        tarballUrl: 'https://registry.npmjs.org/test/-/test-1.0.1.tgz',
        error: null,
      }),
    ];

    const sandbox = {
      sandboxId: 'sandbox_ready',
      writeFiles,
      runCommand: jest.fn().mockImplementation(() =>
        Promise.resolve({
          exitCode: 0,
          stdout: () => Promise.resolve(outputs.shift() || ''),
          stderr: () => Promise.resolve(''),
        })
      ),
      stop,
    };

    const result = await waitForPackageAvailabilityWithSandbox({
      packageName: '@vibeopc/test',
      expectedVersion: '1.0.1',
      maxAttempts: 3,
      intervalMs: 10,
      createSandboxImpl: jest.fn().mockResolvedValue(sandbox),
      sleepImpl,
      onAttempt,
    });

    expect(result.status).toBe('ready');
    expect(result.attempts).toBe(2);
    expect(onAttempt).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledWith({ blocking: true });
    expect(writeFiles).toHaveBeenCalledTimes(1);
  });
});

describe('processPackageCheckJob', () => {
  it('同步成功后会更新任务并发送邮件', async () => {
    const now = new Date('2026-04-18T12:00:00.000Z');
    const update = jest.fn().mockResolvedValue(undefined);
    const prismaClient = {
      packageCheckJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job_1',
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.1',
          email: 'hello@example.com',
          status: 'pending',
          maxAttempts: 10,
          attempts: 0,
          lastError: '',
          sandboxId: '',
          startedAt: null,
          expiresAt: new Date('2026-04-18T12:20:00.000Z'),
          readyAt: null,
          notifiedAt: null,
        }),
        update,
      },
    };

    const monitorPackage = jest.fn(async ({ onAttempt }) => {
      await onAttempt?.({
        attempt: 1,
        sandboxId: 'sandbox_ready',
        result: {
          ready: true,
          versionFound: true,
          tarballReachable: true,
          resolvedVersion: '1.0.1',
          tarballUrl: 'https://registry.npmjs.org/test/-/test-1.0.1.tgz',
          error: null,
        },
      });

      return {
        status: 'ready' as const,
        attempts: 1,
        sandboxId: 'sandbox_ready',
        lastError: '',
        lastResult: {
          ready: true,
          versionFound: true,
          tarballReachable: true,
          resolvedVersion: '1.0.1',
          tarballUrl: 'https://registry.npmjs.org/test/-/test-1.0.1.tgz',
          error: null,
        },
      };
    });
    const sendReadyEmail = jest.fn().mockResolvedValue(undefined);

    await processPackageCheckJob('job_1', {
      prismaClient,
      monitorPackage,
      sendReadyEmail,
      now: () => now,
    });

    expect(monitorPackage).toHaveBeenCalledTimes(1);
    expect(sendReadyEmail).toHaveBeenCalledWith({
      email: 'hello@example.com',
      packageName: '@vibeopc/maidang',
      version: '1.0.1',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        status: 'checking',
        startedAt: now,
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        status: 'ready',
        attempts: 1,
        sandboxId: 'sandbox_ready',
        readyAt: now,
        lastError: '',
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: { notifiedAt: now },
    });
  });

  it('超过时限仍未同步时会标记 timeout', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const prismaClient = {
      packageCheckJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job_2',
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.2',
          email: 'hello@example.com',
          status: 'pending',
          maxAttempts: 10,
          attempts: 0,
          lastError: '',
          sandboxId: '',
          startedAt: null,
          expiresAt: new Date('2026-04-18T12:20:00.000Z'),
          readyAt: null,
          notifiedAt: null,
        }),
        update,
      },
    };

    await processPackageCheckJob('job_2', {
      prismaClient,
      monitorPackage: jest.fn().mockResolvedValue({
        status: 'timeout',
        attempts: 10,
        sandboxId: 'sandbox_timeout',
        lastError: 'Version 1.0.2 is not visible yet',
        lastResult: {
          ready: false,
          versionFound: false,
          tarballReachable: false,
          resolvedVersion: null,
          tarballUrl: null,
          error: 'Version 1.0.2 is not visible yet',
        },
      }),
      sendReadyEmail: jest.fn(),
      now: () => new Date('2026-04-18T12:00:00.000Z'),
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'job_2' },
      data: {
        status: 'timeout',
        attempts: 10,
        sandboxId: 'sandbox_timeout',
        lastError: 'Version 1.0.2 is not visible yet',
      },
    });
  });
});

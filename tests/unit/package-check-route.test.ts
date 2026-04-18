const mockAfter = jest.fn((callback: () => Promise<void> | void) => callback());
const mockProcessPackageCheckJob = jest.fn();
const mockPrisma = {
  profile: {
    findFirst: jest.fn(),
  },
  packageCheckJob: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: mockAfter,
  };
});

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/package-check', () => {
  const actual = jest.requireActual('@/lib/package-check');
  return {
    ...actual,
    processPackageCheckJob: mockProcessPackageCheckJob,
  };
});

import { POST } from '@/app/api/package-check/route';

describe('POST /api/package-check', () => {
  beforeEach(() => {
    mockAfter.mockClear();
    mockProcessPackageCheckJob.mockReset().mockResolvedValue(undefined);
    mockPrisma.profile.findFirst.mockReset();
    mockPrisma.packageCheckJob.findFirst.mockReset();
    mockPrisma.packageCheckJob.create.mockReset();
  });

  it('邮箱非法时返回 400', async () => {
    const response = await POST(
      new Request('http://localhost/api/package-check', {
        method: 'POST',
        body: JSON.stringify({
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.1',
          email: 'not-an-email',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe(400);
    expect(data.message).toBe('邮箱格式不正确');
    expect(mockPrisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it('找不到已发布 profile 时返回 404', async () => {
    mockPrisma.profile.findFirst.mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/package-check', {
        method: 'POST',
        body: JSON.stringify({
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.1',
          email: 'hello@example.com',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.code).toBe(404);
    expect(data.message).toBe('找不到对应的已发布名片');
  });

  it('会创建任务并在响应后触发后台检查', async () => {
    const now = new Date('2026-04-18T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    mockPrisma.profile.findFirst.mockResolvedValue({
      id: 'profile_1',
      npmPackage: '@vibeopc/maidang',
    });
    mockPrisma.packageCheckJob.findFirst.mockResolvedValue(null);
    mockPrisma.packageCheckJob.create.mockResolvedValue({
      id: 'job_1',
      status: 'pending',
    });

    const response = await POST(
      new Request('http://localhost/api/package-check', {
        method: 'POST',
        body: JSON.stringify({
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.1',
          email: 'hello@example.com',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(0);
    expect(mockPrisma.packageCheckJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        profileId: 'profile_1',
        packageName: '@vibeopc/maidang',
        expectedVersion: '1.0.1',
        email: 'hello@example.com',
        status: 'pending',
      }),
    });
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockProcessPackageCheckJob).toHaveBeenCalledWith('job_1');

    jest.useRealTimers();
  });

  it('已有 checking 任务时复用任务而不是重新启动', async () => {
    mockPrisma.profile.findFirst.mockResolvedValue({
      id: 'profile_1',
      npmPackage: '@vibeopc/maidang',
    });
    mockPrisma.packageCheckJob.findFirst.mockResolvedValue({
      id: 'job_2',
      status: 'checking',
      expiresAt: new Date('2026-04-18T12:20:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/package-check', {
        method: 'POST',
        body: JSON.stringify({
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.1',
          email: 'hello@example.com',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(0);
    expect(data.data.status).toBe('checking');
    expect(mockPrisma.packageCheckJob.create).not.toHaveBeenCalled();
    expect(mockAfter).not.toHaveBeenCalled();
    expect(mockProcessPackageCheckJob).not.toHaveBeenCalled();
  });

  it('数据库缺少表时返回可诊断错误', async () => {
    mockPrisma.profile.findFirst.mockResolvedValue({
      id: 'profile_1',
      npmPackage: '@vibeopc/maidang',
    });
    mockPrisma.packageCheckJob.findFirst.mockRejectedValue({
      code: 'P2021',
    });

    const response = await POST(
      new Request('http://localhost/api/package-check', {
        method: 'POST',
        body: JSON.stringify({
          packageName: '@vibeopc/maidang',
          expectedVersion: '1.0.1',
          email: 'hello@example.com',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.code).toBe(503);
    expect(data.message).toContain('Prisma migration');
  });
});

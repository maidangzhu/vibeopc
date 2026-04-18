const afterCallbacks: Promise<unknown>[] = [];
const sendPackageReadyEmail = jest.fn().mockResolvedValue(undefined);

type ProfileRecord = {
  id: string;
  npmPackage: string | null;
};

type JobRecord = {
  id: string;
  profileId: string;
  packageName: string;
  expectedVersion: string;
  email: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string;
  sandboxId: string;
  startedAt: Date | null;
  expiresAt: Date;
  readyAt: Date | null;
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const store: {
  profiles: ProfileRecord[];
  jobs: JobRecord[];
} = {
  profiles: [],
  jobs: [],
};

function cloneJob(job: JobRecord): JobRecord {
  return {
    ...job,
    startedAt: job.startedAt ? new Date(job.startedAt) : null,
    expiresAt: new Date(job.expiresAt),
    readyAt: job.readyAt ? new Date(job.readyAt) : null,
    notifiedAt: job.notifiedAt ? new Date(job.notifiedAt) : null,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
  };
}

const mockPrisma = {
  profile: {
    findFirst: jest.fn(async ({ where }: { where: { npmPackage: string } }) => {
      const profile = store.profiles.find((item) => item.npmPackage === where.npmPackage);
      return profile ? { ...profile } : null;
    }),
  },
  packageCheckJob: {
    findFirst: jest.fn(async ({
      where,
    }: {
      where: {
        profileId: string;
        packageName: string;
        expectedVersion: string;
        email: string;
        status: { in: string[] };
      };
    }) => {
      const matched = store.jobs
        .filter((job) =>
          job.profileId === where.profileId &&
          job.packageName === where.packageName &&
          job.expectedVersion === where.expectedVersion &&
          job.email === where.email &&
          where.status.in.includes(job.status)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      return matched ? cloneJob(matched) : null;
    }),
    create: jest.fn(async ({ data }: { data: Omit<JobRecord, 'id' | 'createdAt' | 'updatedAt' | 'readyAt' | 'notifiedAt' | 'startedAt'> & Partial<JobRecord> }) => {
      const now = new Date();
      const job: JobRecord = {
        id: `job_${store.jobs.length + 1}`,
        profileId: data.profileId,
        packageName: data.packageName,
        expectedVersion: data.expectedVersion,
        email: data.email,
        status: data.status || 'pending',
        attempts: data.attempts ?? 0,
        maxAttempts: data.maxAttempts ?? 10,
        lastError: data.lastError || '',
        sandboxId: data.sandboxId || '',
        startedAt: data.startedAt || null,
        expiresAt: data.expiresAt,
        readyAt: data.readyAt || null,
        notifiedAt: data.notifiedAt || null,
        createdAt: now,
        updatedAt: now,
      };

      store.jobs.push(job);
      return cloneJob(job);
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      const job = store.jobs.find((item) => item.id === where.id);
      return job ? cloneJob(job) : null;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<JobRecord> }) => {
      const job = store.jobs.find((item) => item.id === where.id);
      if (!job) {
        throw new Error(`Job ${where.id} not found`);
      }

      Object.assign(job, data, { updatedAt: new Date() });
      return cloneJob(job);
    }),
  },
};

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: jest.fn((callback: () => Promise<void> | void) => {
      afterCallbacks.push(Promise.resolve().then(() => callback()));
    }),
  };
});

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/email', () => ({
  sendPackageReadyEmail,
}));

import { __mockSandbox } from '../../__mocks__/@vercel/sandbox';
import { POST } from '@/app/api/package-check/route';

describe('package check flow', () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    store.profiles.length = 0;
    store.jobs.length = 0;
    sendPackageReadyEmail.mockClear();
    mockPrisma.profile.findFirst.mockClear();
    mockPrisma.packageCheckJob.findFirst.mockClear();
    mockPrisma.packageCheckJob.create.mockClear();
    mockPrisma.packageCheckJob.findUnique.mockClear();
    mockPrisma.packageCheckJob.update.mockClear();
    __mockSandbox.sandboxId = 'sandbox_flow';
    __mockSandbox.writeFiles.mockClear().mockResolvedValue(undefined);
    __mockSandbox.stop.mockClear().mockResolvedValue(undefined);
    __mockSandbox.runCommand.mockReset().mockResolvedValue({
      exitCode: 0,
      stdout: () =>
        Promise.resolve(
          JSON.stringify({
            ready: true,
            versionFound: true,
            tarballReachable: true,
            resolvedVersion: '1.0.1',
            tarballUrl: 'https://registry.npmjs.org/testemail1/-/testemail1-1.0.1.tgz',
            error: null,
          })
        ),
      stderr: () => Promise.resolve(''),
    });
  });

  it('会从创建任务一路执行到 ready 和发邮件', async () => {
    store.profiles.push({
      id: 'profile_1',
      npmPackage: '@vibeopc/testemail1',
    });

    const response = await POST(
      new Request('http://localhost/api/package-check', {
        method: 'POST',
        body: JSON.stringify({
          packageName: '@vibeopc/testemail1',
          expectedVersion: '1.0.1',
          email: 'borisdunk@sina.com',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const data = await response.json();

    await Promise.all(afterCallbacks);

    expect(response.status).toBe(200);
    expect(data.code).toBe(0);
    expect(data.data.jobId).toBe('job_1');
    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0].status).toBe('ready');
    expect(store.jobs[0].attempts).toBe(1);
    expect(store.jobs[0].sandboxId).toBe('sandbox_flow');
    expect(store.jobs[0].readyAt).toBeInstanceOf(Date);
    expect(store.jobs[0].notifiedAt).toBeInstanceOf(Date);
    expect(sendPackageReadyEmail).toHaveBeenCalledWith({
      email: 'borisdunk@sina.com',
      packageName: '@vibeopc/testemail1',
      version: '1.0.1',
    });
    expect(__mockSandbox.writeFiles).toHaveBeenCalledTimes(1);
    expect(__mockSandbox.runCommand).toHaveBeenCalledTimes(1);
    expect(__mockSandbox.stop).toHaveBeenCalledTimes(1);
    expect(__mockSandbox.stop).toHaveBeenCalledWith({ blocking: true });
  });
});

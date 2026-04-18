import { sendPackageReadyEmail } from '@/lib/email';

describe('sendPackageReadyEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('缺少 RESEND_API_KEY 时直接报错', async () => {
    await expect(
      sendPackageReadyEmail({
        email: 'hello@example.com',
        packageName: '@vibeopc/maidang',
        version: '1.0.1',
        fetchImpl: jest.fn(),
      })
    ).rejects.toThrow('RESEND_API_KEY is not set');
  });

  it('会按预期调用 Resend API', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'VibeOPC <notify@example.com>';

    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
    });

    await sendPackageReadyEmail({
      email: 'hello@example.com',
      packageName: '@vibeopc/maidang',
      version: '1.0.1',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_key',
          'Content-Type': 'application/json',
        }),
      })
    );

    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(payload.from).toBe('VibeOPC <notify@example.com>');
    expect(payload.to).toEqual(['hello@example.com']);
    expect(payload.subject).toContain('@vibeopc/maidang');
    expect(payload.html).toContain('npx @vibeopc/maidang');
  });

  it('Resend 返回失败时抛出错误', async () => {
    process.env.RESEND_API_KEY = 're_test_key';

    await expect(
      sendPackageReadyEmail({
        email: 'hello@example.com',
        packageName: '@vibeopc/maidang',
        version: '1.0.1',
        fetchImpl: jest.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('boom'),
        }),
      })
    ).rejects.toThrow('boom');
  });
});

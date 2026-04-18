type FetchLike = typeof fetch;

export interface SendPackageReadyEmailOptions {
  email: string;
  packageName: string;
  version: string;
  fetchImpl?: FetchLike;
}

function buildPackageCommand(packageName: string): string {
  return `npx ${packageName}`;
}

export async function sendPackageReadyEmail({
  email,
  packageName,
  version,
  fetchImpl = fetch,
}: SendPackageReadyEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const from = process.env.RESEND_FROM_EMAIL || 'VibeOPC <onboarding@resend.dev>';
  const command = buildPackageCommand(packageName);
  const npmUrl = `https://www.npmjs.com/package/${packageName}`;

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `你的 CLI 已经可以使用了：${packageName}`,
      html: [
        '<div style="font-family: sans-serif; line-height: 1.6; color: #111;">',
        '<h2>你的 CLI 已经准备好了</h2>',
        `<p><strong>包名：</strong>${packageName}</p>`,
        `<p><strong>版本：</strong>${version}</p>`,
        `<p><strong>命令：</strong><code>${command}</code></p>`,
        `<p><a href="${npmUrl}">查看 npm 页面</a></p>`,
        '<p>如果刚打开还有短暂延迟，可以稍后再试一次。</p>',
        '</div>',
      ].join(''),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Resend request failed with ${response.status}`);
  }
}

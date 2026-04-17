'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CommandForm from '@/components/CommandForm';
import ProfileForm from '@/components/ProfileForm';
import Terminal from '@/components/Terminal';
import { UserProfile } from '@/lib/types';

type Tab = 'profile' | 'commands';

const DEFAULT_TEMPLATE_ID = 'personal';

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#e8633a', '#f07048', '#56d364', '#58a6ff', '#e3b341', '#fafafa'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      angle: number;
      spin: number;
      life: number;
    }> = [];

    for (let i = 0; i < 120; i += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 0.2,
        life: 1,
      });
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.08;
        particle.angle += particle.spin;
        particle.life -= 0.008;

        if (particle.life <= 0 || particle.y > canvas.height + 50) continue;
        alive = true;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.angle * Math.PI) / 180);
        ctx.globalAlpha = Math.min(particle.life, 1);
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.5);
        ctx.restore();
      }

      if (alive) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} id="confetti-canvas" />;
}

function PreviewPlaceholder() {
  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div>
        <p className="text-sm font-semibold">还没有生成结果</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          先输入你的资料，点击“生成 CLI 草稿”。系统会整理出一版可编辑的内容，放到下面给你继续调整。
        </p>
      </div>

      <div className="grid gap-3">
        {[
          '1. 自然语言输入资料',
          '2. 生成命令草稿',
          '3. 编辑和调整内容',
          '4. 结果确认并发布',
        ].map((step) => (
          <div
            key={step}
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreatePage() {
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    name: '',
    bio: '',
    avatarUrl: '',
    location: '杭州',
    socialLinks: [],
    commands: [],
    templateId: DEFAULT_TEMPLATE_ID,
  });
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<'idle' | 'saving' | 'publishing' | 'done' | 'error'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedPkg, setPublishedPkg] = useState<string | null>(null);
  const [npmUrl, setNpmUrl] = useState<string | null>(null);
  const [previewCommand, setPreviewCommand] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [initialUsername, setInitialUsername] = useState('');
  const [saveLabel, setSaveLabel] = useState('仅保存');

  const persistProfile = async () => {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profile,
        originalUsername: initialUsername || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || '保存失败');
    }

    if (!initialUsername) {
      setInitialUsername(profile.username);
    }

    return data;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('u');

    if (!username) return;

    setInitialUsername(username);
    fetch(`/api/profile/${username}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const loadedProfile = data.profile;
        setProfile({
          username: loadedProfile.username,
          name: loadedProfile.name,
          bio: loadedProfile.bio,
          avatarUrl: loadedProfile.avatarUrl,
          location: loadedProfile.location,
          templateId: loadedProfile.templateId || DEFAULT_TEMPLATE_ID,
          commands: loadedProfile.commands.map(
            (command: {
              id: string;
              name: string;
              description: string;
              content: string;
              templateType?: string;
            }) => ({
              id: command.id,
              name: command.name,
              description: command.description,
              content: command.content,
              templateType: (command.templateType || 'markdown') as UserProfile['commands'][number]['templateType'],
            })
          ),
          socialLinks: loadedProfile.socialLinks.map((link: { platform: string; url: string }) => ({
            platform: link.platform,
            url: link.url,
          })),
        });
        setHasDraft(loadedProfile.commands.length > 0);
      })
      .catch(() => {
        setProfile((current) => ({ ...current, username }));
      });
  }, []);

  const handleGenerate = async () => {
    if (!profile.username) {
      setGenerationError('请先填写用户名');
      return;
    }

    if (!prompt.trim()) {
      setGenerationError('请先输入你的资料');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setPublishError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          prompt,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || '生成失败');
      }

      setProfile(data.profile);
      setHasDraft(true);
      setActiveTab('profile');
      setPreviewCommand(null);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!profile.username || !profile.name) {
      alert('请先生成或补充你的资料');
      return;
    }

    setIsPublishing(true);
    setPublishStep('saving');
    setPublishError(null);

    try {
      await persistProfile();

      setPublishStep('publishing');
      const publishResponse = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      });

      if (!publishResponse.ok) {
        const data = await publishResponse.json();
        throw new Error(data.error || '发布失败');
      }

      const publishData = await publishResponse.json();
      setPublishedPkg(publishData.packageName || `@vibeopc/${profile.username}`);
      setNpmUrl(publishData.npmUrl || `https://www.npmjs.com/package/@vibeopc/${profile.username}`);
      setPublishStep('done');
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : '发布失败，请稍后重试');
      setPublishStep('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = async () => {
    if (!profile.username) return;

    try {
      await persistProfile();
      setSaveLabel('已保存');
      setTimeout(() => setSaveLabel('仅保存'), 1500);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : '保存失败，请稍后重试');
      setPublishStep('error');
    }
  };

  const copyCommand = () => {
    const command = `npx ${publishedPkg}`;
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (publishStep === 'done') {
    return (
      <>
        <ConfettiCanvas />
        <div className="min-h-screen bg-black text-white/95 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#56d364" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-semibold mb-2">发布成功！</h1>
              <p className="text-white/40 text-sm leading-relaxed">
                任何人现在都可以通过以下命令认识你 · npm 传播可能需要 1-2 分钟
              </p>
            </div>

            <div className="rounded-2xl p-5 text-left" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-xs mb-3" style={{ color: '#8b949e' }}>Terminal</div>
              <code className="text-base font-mono" style={{ color: '#56d364' }}>
                npx {publishedPkg}
              </code>
            </div>

            <div className="flex gap-3 justify-center items-center">
              <button onClick={copyCommand} className="btn btn-primary px-5 py-2.5 text-sm font-medium">
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    复制命令
                  </>
                )}
              </button>
              <a
                href={npmUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost px-5 py-2.5 text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                查看 npm
              </a>
              <Link href="/" className="btn btn-ghost px-5 py-2.5 text-sm">
                返回首页
              </Link>
            </div>

            <p className="text-white/20 text-xs">
              如遇 404，稍等 1-2 分钟后再试 · 永久有效，随时 npx 访问
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white/95">
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-[#e8633a] flex items-center justify-center text-sm font-bold text-white">V</div>
            VibeOPC
          </Link>
          <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            ← 返回
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">用自然语言生成你的 CLI</h1>
          <p className="text-white/40 text-sm">
            一次输入资料，系统自动生成命令草稿；发布前你仍然可以逐项编辑和确认。
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,420px] gap-10">
          <div className="space-y-5">
            <div className="card space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">自然语言输入</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    这里是第一步，也是唯一的输入入口。系统会先帮你整理出一版草稿，后面你可以继续修改。
                  </p>
                </div>
              </div>

              <div>
                <label className="label">Username <span>*</span></label>
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  <span
                    className="px-3.5 py-2.5 text-sm font-mono"
                    style={{
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.02)',
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        username: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                      }))
                    }
                    placeholder="yourname"
                    className="flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none font-mono"
                    style={{ color: 'var(--text)' }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                  发布命令：<span className="font-mono" style={{ color: 'var(--t-green)' }}>npx @vibeopc/{profile.username || 'yourname'}</span>
                </p>
              </div>

              <div>
                <label className="label">你的资料 <span>*</span></label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="例如：我是麦当，独立开发者，主要做工具和内容产品。希望 CLI 里有项目、技能、合作方式和联系方式。我的 GitHub 是 https://github.com/maidang ..."
                  rows={10}
                  className="input px-4 py-3 text-sm leading-relaxed"
                />
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
                  建议把“你是谁、做过什么、想展示什么、链接在哪里、希望命令怎么命名/偏什么风格”一次性写进去。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !profile.username || !prompt.trim()}
                  className="btn btn-primary px-5 py-3 text-sm"
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner" />
                      生成 CLI 草稿...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.912 5.813h6.11l-4.945 3.594 1.89 5.813L12 14.625 7.033 18.22l1.89-5.813-4.945-3.594h6.11L12 3z" />
                      </svg>
                      生成 CLI 草稿
                    </>
                  )}
                </button>

              </div>
            </div>

            {generationError && (
              <div className="card-sm flex items-start gap-3" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm" style={{ color: '#f85149' }}>{generationError}</p>
              </div>
            )}

            {hasDraft ? (
              <>
                <div className="tab-group">
                  <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    个人信息
                  </button>
                  <button className={`tab ${activeTab === 'commands' ? 'active' : ''}`} onClick={() => setActiveTab('commands')}>
                    命令配置
                  </button>
                </div>

                <div className="card">
                  {activeTab === 'profile' ? (
                    <ProfileForm
                      profile={profile}
                      onChange={setProfile}
                      initialUsername={initialUsername}
                      onUsernameTakenChange={setUsernameTaken}
                    />
                  ) : (
                    <CommandForm profile={profile} onChange={setProfile} />
                  )}
                </div>
              </>
            ) : null}

            <div className="space-y-3">
              {publishStep === 'error' && publishError && (
                <div className="card-sm flex items-start gap-3" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-sm" style={{ color: '#f85149' }}>{publishError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !hasDraft || !profile.username || !profile.name || usernameTaken}
                  className="btn btn-primary flex-1 py-3 text-sm font-medium"
                >
                  {isPublishing ? (
                    <>
                      <span className="spinner" />
                      {publishStep === 'saving' ? '保存中...' : '发布中...'}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      发布名片
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasDraft || !profile.username || isPublishing}
                  className="btn btn-ghost px-5 py-3 text-sm"
                >
                  {saveLabel}
                </button>
              </div>

              {!hasDraft && (
                <p className="text-center text-white/25 text-xs">先生成 CLI 草稿，再进行保存或发布</p>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <h2 className="text-sm font-medium" style={{ color: '#8b949e' }}>实时预览</h2>
              </div>

              {profile.commands.length > 0 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewCommand(null)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-all"
                    style={{
                      background: previewCommand === null ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderColor: previewCommand === null ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                      color: previewCommand === null ? '#fafafa' : '#8b949e',
                    }}
                  >
                    主菜单
                  </button>
                  {profile.commands.slice(0, 3).map((command) => (
                    <button
                      key={command.id}
                      onClick={() => setPreviewCommand(command.name)}
                      className="px-3 py-1.5 text-xs rounded-lg border transition-all"
                      style={{
                        background: previewCommand === command.name ? 'rgba(232,99,58,0.1)' : 'transparent',
                        borderColor: previewCommand === command.name ? 'rgba(232,99,58,0.35)' : 'rgba(255,255,255,0.06)',
                        color: previewCommand === command.name ? '#e8633a' : '#8b949e',
                      }}
                    >
                      {command.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasDraft ? (
              <Terminal
                profile={profile}
                showCommandOutput={previewCommand}
                onPreviewCommand={setPreviewCommand}
                className="w-full"
              />
            ) : (
              <PreviewPlaceholder />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '@/lib/types';
import { TEMPLATES, applyTemplate, getTemplateById } from '@/lib/templates';
import ProfileForm from '@/components/ProfileForm';
import CommandForm from '@/components/CommandForm';
import Terminal from '@/components/Terminal';
import Link from 'next/link';

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
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; angle: number; spin: number;
      life: number;
    }> = [];

    const total = 120;
    for (let i = 0; i < total; i++) {
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

    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.angle += p.spin;
        p.life -= 0.008;

        if (p.life <= 0 || p.y > canvas.height + 50) continue;
        alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.globalAlpha = Math.min(p.life, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
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

export default function CreatePage() {
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    name: '麦当',
    bio: '全栈工程师 / AI 爱好者 / 独立开发者',
    avatarUrl: '',
    location: '杭州',
    socialLinks: [
      { platform: 'GitHub', url: 'https://github.com/maidang' },
      { platform: 'Twitter', url: 'https://twitter.com/maidang' },
    ],
    commands: [],
    templateId: DEFAULT_TEMPLATE_ID,
  });
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<'idle' | 'saving' | 'publishing' | 'done' | 'error'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedPkg, setPublishedPkg] = useState<string | null>(null);
  const [previewCommand, setPreviewCommand] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load profile on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    const tpl = TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) ?? TEMPLATES[0];

    if (u) {
      fetch(`/api/profile/${u}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          const p = data.profile;
          setProfile({
            username: p.username,
            name: p.name,
            bio: p.bio,
            avatarUrl: p.avatarUrl,
            location: p.location,
            templateId: p.templateId || DEFAULT_TEMPLATE_ID,
            commands:
              p.commands.length > 0
                ? p.commands.map((cmd: { id: string; name: string; description: string; content: string; templateType?: string }) => ({
                    id: cmd.id,
                    name: cmd.name,
                    description: cmd.description,
                    content: cmd.content,
                    templateType: (cmd.templateType || 'free') as UserProfile['commands'][0]['templateType'],
                  }))
                : applyTemplate(tpl),
            socialLinks: p.socialLinks.map((link: { platform: string; url: string }) => ({
              platform: link.platform,
              url: link.url,
            })),
          });
        })
        .catch(() => {
          setProfile((prev) => ({ ...prev, username: u, templateId: tpl.id, commands: applyTemplate(tpl) }));
        });
    } else {
      setProfile((prev) => ({ ...prev, templateId: tpl.id, commands: applyTemplate(tpl) }));
    }
  }, []);

  const handleTemplateChange = (templateId: string) => {
    const tpl = getTemplateById(templateId);
    if (!tpl) return;
    const oldCmdMap = new Map(profile.commands.map((c) => [c.name, c.content]));
    const newCommands = applyTemplate(tpl, Object.fromEntries(oldCmdMap));
    setProfile((prev) => ({ ...prev, templateId, commands: newCommands }));
    setPreviewCommand(null);
  };

  const handlePublish = async () => {
    if (!profile.username || !profile.name) {
      alert('请填写用户名和姓名');
      return;
    }
    setIsPublishing(true);
    setPublishStep('saving');
    setPublishError(null);

    try {
      // Step 1: Save profile
      const saveRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || '保存失败');
      }

      // Step 2: Publish
      setPublishStep('publishing');
      const pubRes = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      });
      if (!pubRes.ok) {
        const data = await pubRes.json();
        throw new Error(data.error || '发布失败');
      }
      const pubData = await pubRes.json();
      setPublishedPkg(pubData.packageName || `@vibeopc/${profile.username}`);
      setPublishStep('done');
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : '发布失败，请稍后重试');
      setPublishStep('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyCommand = () => {
    const cmd = `npx ${publishedPkg}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Published success screen
  if (publishStep === 'done') {
    return (
      <>
        <ConfettiCanvas />
        <div className="min-h-screen bg-black text-white/95 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
            {/* Success icon */}
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

            {/* Command card */}
            <div className="rounded-2xl p-5 text-left" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-xs mb-3" style={{ color: '#8b949e' }}>Terminal</div>
              <code className="text-base font-mono" style={{ color: '#56d364' }}>
                npx {publishedPkg}
              </code>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={copyCommand} className="btn btn-primary px-5 py-2.5 text-sm font-medium">
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    复制命令
                  </>
                )}
              </button>
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
      {/* Header */}
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
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">配置你的专属 CLI</h1>
          <p className="text-white/40 text-sm">
            填写信息，实时预览，一键发布
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,420px] gap-10">
          {/* Left: Form */}
          <div className="space-y-5">
            {/* Tab nav */}
            <div className="tab-group">
              <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                个人信息
              </button>
              <button className={`tab ${activeTab === 'commands' ? 'active' : ''}`} onClick={() => setActiveTab('commands')}>
                命令配置
              </button>
            </div>

            {/* Form card */}
            <div className="card">
              {/* Template selector — profile tab only */}
              {activeTab === 'profile' && (
                <div className="mb-6">
                  <label className="label">选择模板</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleTemplateChange(tpl.id)}
                        className="p-3 rounded-xl border text-left transition-all"
                        style={{
                          background: profile.templateId === tpl.id ? 'rgba(232,99,58,0.1)' : 'rgba(255,255,255,0.03)',
                          borderColor: profile.templateId === tpl.id ? 'rgba(232,99,58,0.35)' : 'rgba(255,255,255,0.07)',
                        }}
                      >
                        <div className="text-sm font-medium mb-0.5" style={{ color: profile.templateId === tpl.id ? '#e8633a' : '#fafafa' }}>
                          {tpl.name}
                        </div>
                        <div className="text-xs" style={{ color: '#8b949e' }}>{tpl.description}</div>
                        <div className="text-xs mt-1" style={{ color: '#6e7681' }}>{tpl.commands.length} 个命令</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'profile' ? (
                <ProfileForm profile={profile} onChange={setProfile} />
              ) : (
                <CommandForm profile={profile} onChange={setProfile} />
              )}
            </div>

            {/* Publish area */}
            <div className="space-y-3">
              {/* Error message */}
              {publishStep === 'error' && publishError && (
                <div className="card-sm flex items-start gap-3" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-sm" style={{ color: '#f85149' }}>{publishError}</p>
                </div>
              )}

              {/* Publish button */}
              <div className="flex gap-3">
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !profile.username || !profile.name}
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      发布名片
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (!profile.username) return;
                    await fetch('/api/profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(profile),
                    });
                    const btn = document.querySelector('[data-saved-msg]');
                    if (btn) {
                      btn.textContent = '已保存';
                      setTimeout(() => (btn.textContent = '仅保存'), 1500);
                    }
                  }}
                  disabled={!profile.username || isPublishing}
                  className="btn btn-ghost px-5 py-3 text-sm"
                  data-saved-msg="仅保存"
                >
                  仅保存
                </button>
              </div>

              {!profile.username && (
                <p className="text-center text-white/25 text-xs">填写用户名后即可发布</p>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <h2 className="text-sm font-medium" style={{ color: '#8b949e' }}>实时预览</h2>
              </div>

              {/* Command selector — nicer than select */}
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
                {profile.commands.slice(0, 3).map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => setPreviewCommand(cmd.name)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-all"
                    style={{
                      background: previewCommand === cmd.name ? 'rgba(232,99,58,0.1)' : 'transparent',
                      borderColor: previewCommand === cmd.name ? 'rgba(232,99,58,0.35)' : 'rgba(255,255,255,0.06)',
                      color: previewCommand === cmd.name ? '#e8633a' : '#8b949e',
                    }}
                  >
                    {cmd.name}
                  </button>
                ))}
              </div>
            </div>

            <Terminal
              profile={profile}
              showCommandOutput={previewCommand}
              onPreviewCommand={setPreviewCommand}
              className="w-full"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { UserProfile, DEFAULT_COMMANDS } from '@/lib/types';
import ProfileForm from '@/components/ProfileForm';
import CommandForm from '@/components/CommandForm';
import Terminal from '@/components/Terminal';
import Link from 'next/link';

type Tab = 'profile' | 'commands';

const DEFAULT_PROFILE: UserProfile = {
  username: '',
  name: '麦当',
  bio: '全栈工程师 / AI 爱好者 / 独立开发者',
  avatarUrl: '',
  location: '杭州',
  socialLinks: [
    { platform: 'GitHub', url: 'https://github.com/maidang' },
    { platform: 'Twitter', url: 'https://twitter.com/maidang' },
  ],
  commands: DEFAULT_COMMANDS,
};

export default function CreatePage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [previewCommand, setPreviewCommand] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load profile on mount if username in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    if (u) {
      fetch(`/api/profile/${u}`)
        .then((r) => {
          if (r.ok) return r.json();
          throw new Error('not found');
        })
        .then((data) => {
          const p = data.profile;
          setProfile({
            username: p.username,
            name: p.name,
            bio: p.bio,
            avatarUrl: p.avatarUrl,
            location: p.location,
            commands:
              p.commands.length > 0
                ? p.commands.map((cmd: { id: string; name: string; description: string; content: string }) => ({
                    id: cmd.id,
                    name: cmd.name,
                    description: cmd.description,
                    content: cmd.content,
                  }))
                : DEFAULT_COMMANDS,
            socialLinks: p.socialLinks.map((link: { platform: string; url: string }) => ({
              platform: link.platform,
              url: link.url,
            })),
          });
        })
        .catch(() => {
          // Profile not found, use defaults
          setProfile((prev) => ({ ...prev, username: u }));
        });
    }
  }, []);

  const handleSave = async () => {
    if (!profile.username) {
      alert('请先填写用户名');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!profile.username || !profile.name) {
      alert('请填写用户名和姓名');
      return;
    }
    setIsPublishing(true);
    try {
      // Save first
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      // Then publish
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '发布失败');
      }
      setPublished(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : '发布失败');
    } finally {
      setIsPublishing(false);
    }
  };

  if (published) {
    return (
      <div className="min-h-screen bg-black text-white/95 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-semibold">发布成功！</h1>
          <p className="text-white/50 text-sm">
            你的 CLI 名片已上线，任何人都可以通过以下命令了解你：
          </p>
          <div
            className="rounded-xl p-4 text-left"
            style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-xs mb-2" style={{ color: '#8b949e' }}>
              Terminal
            </div>
            <code className="text-sm" style={{ color: '#56d364' }}>
              npx @vibeopc/{profile.username}
            </code>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigator.clipboard.writeText(`npx @vibeopc/${profile.username}`)}
              className="px-5 py-2.5 bg-[#d97857] hover:bg-[#e08a6b] text-white text-sm font-medium rounded-lg transition-colors"
            >
              复制命令
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-sm font-medium rounded-lg transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white/95">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <div className="w-7 h-7 rounded-lg bg-[#d97857] flex items-center justify-center text-sm font-bold text-white">
              V
            </div>
            <span>VibeOPC</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← 返回
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">配置你的专属 CLI</h1>
          <p className="text-white/40 text-sm">
            填写你的信息，实时预览效果，发布后即可获得一条命令
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left: Form */}
          <div className="space-y-5">
            {/* Tab navigation */}
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => setActiveTab('profile')}
                className={`tab flex-1 ${activeTab === 'profile' ? 'active' : ''}`}
              >
                个人信息
              </button>
              <button
                onClick={() => setActiveTab('commands')}
                className={`tab flex-1 ${activeTab === 'commands' ? 'active' : ''}`}
              >
                命令配置
              </button>
            </div>

            {/* Form card */}
            <div
              className="rounded-xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {activeTab === 'profile' ? (
                <ProfileForm profile={profile} onChange={setProfile} />
              ) : (
                <CommandForm profile={profile} onChange={setProfile} />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !profile.username}
                className="btn-ghost flex-1 px-4 py-3 text-sm"
              >
                {isSaving ? '保存中...' : saved ? '✓ 已保存' : '保存'}
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || !profile.username || !profile.name}
                className="btn-primary flex-1 px-4 py-3 text-sm"
              >
                {isPublishing ? '发布中...' : '发布名片'}
              </button>
            </div>

            {!profile.username && (
              <p className="text-center text-white/30 text-xs">
                请填写用户名后即可保存和发布
              </p>
            )}
          </div>

          {/* Right: Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
            {/* Preview mode selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: '#8b949e' }}>
                  📺
                </span>
                <h2 className="text-sm font-medium" style={{ color: '#8b949e' }}>
                  实时预览
                </h2>
              </div>

              {/* Preview mode dropdown */}
              <select
                value={previewCommand ?? '__menu__'}
                onChange={(e) =>
                  setPreviewCommand(e.target.value === '__menu__' ? null : e.target.value)
                }
                className="input px-3 py-1.5 text-xs"
                style={{ width: 'auto' }}
              >
                <option value="__menu__">📋 主菜单</option>
                {profile.commands.map((cmd) => (
                  <option key={cmd.id} value={cmd.name}>
                    ❯ {cmd.name} — {cmd.description}
                  </option>
                ))}
              </select>
            </div>

            <Terminal
              profile={profile}
              showCommandOutput={previewCommand}
              onPreviewCommand={setPreviewCommand}
              className="w-full"
            />

            <p className="text-center text-white/25 text-xs">
              {previewCommand
                ? `当前预览：「${previewCommand}」输出 | 点击命令名或 👁 切换`
                : '点击命令名或 👁 预览输出效果'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

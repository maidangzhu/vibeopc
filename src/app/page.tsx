'use client';

import Link from 'next/link';
import Terminal from '@/components/Terminal';
import { DEFAULT_COMMANDS } from '@/lib/types';

const DEMO_PROFILE = {
  username: 'demo',
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

const FEATURES = [
  {
    emoji: '🤖',
    title: 'AI 时代的名片',
    desc: '让 Agent 一条命令了解你是谁、会什么、在哪里找到你',
  },
  {
    emoji: '⚡',
    title: '30 秒生成',
    desc: '填写表单，实时预览，一键发布。无需编写代码',
  },
  {
    emoji: '🔗',
    title: '永久有效',
    desc: '基于 npm 包，永久可访问。随时更新信息',
  },
];

const AUDIENCES = [
  { emoji: '🎨', title: 'KOL / 创作者', desc: '建立个人品牌，让粉丝一键了解你' },
  { emoji: '🚀', title: '副业者 / 一人公司', desc: '分散在多个平台？统一入口，方便建联' },
  { emoji: '🎮', title: 'AI 爱好者', desc: '好玩 + 有用，低门槛，有成就感' },
  { emoji: '💻', title: '独立开发者', desc: '技术圈的身份证明，展示你的项目和技能' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white/95">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              V
            </div>
            <span className="text-base font-semibold tracking-tight">VibeOPC</span>
          </div>
          <Link
            href="/create"
            className="btn btn-primary px-4 py-2 text-sm"
          >
            开始创建
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-xs rounded-full border animate-fade-in"
            style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
            <span>AI 时代的数字名片</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5 leading-tight animate-fade-in" style={{ animationDelay: '60ms' }}>
            一条命令，让全世界<br className="hidden sm:block" />了解你
          </h1>

          {/* Subheading */}
          <p className="text-base mb-10 max-w-md mx-auto leading-relaxed animate-fade-in" style={{ color: 'var(--text-muted)', animationDelay: '120ms' }}>
            帮任何人快速生成专属 CLI 名片工具，让 AI / 他人只需一个命令就能了解你是谁、会什么、在哪里找到你。
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 animate-fade-in" style={{ animationDelay: '180ms' }}>
            <Link href="/create" className="btn btn-primary px-6 py-3">
              开始创建我的名片
            </Link>
            <button
              onClick={() => navigator.clipboard.writeText('npx @vibeopc/demo')}
              className="btn btn-outline px-6 py-3"
            >
              npx @vibeopc/demo →
            </button>
          </div>

          {/* Demo Terminal */}
          <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '240ms' }}>
            <Terminal profile={DEMO_PROFILE} className="w-full" />
          </div>
        </section>

        {/* Features */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: '80px', paddingBottom: '80px' }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-lg font-semibold text-center mb-10" style={{ color: 'var(--text-muted)' }}>
              为什么选择 VibeOPC？
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="text-2xl mb-4">{f.emoji}</div>
                  <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: '80px', paddingBottom: '80px' }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-lg font-semibold text-center mb-10" style={{ color: 'var(--text-muted)' }}>
              适用人群
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {AUDIENCES.map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="text-xl mb-3">{item.emoji}</div>
                  <h3 className="font-semibold mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: '80px', paddingBottom: '100px' }}>
          <div className="max-w-md mx-auto px-6 text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>免费 · 快速 · 永久有效</p>
            <h2 className="text-lg font-semibold mb-6">立即创建你的专属 CLI 名片</h2>
            <Link href="/create" className="btn btn-primary px-6 py-3 inline-flex items-center gap-2">
              开始创建
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', paddingBottom: '32px' }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              V
            </div>
            <span className="text-sm font-medium">VibeOPC</span>
            <span className="text-xs">· AI 时代的数字名片</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-subtle)' }}>
            <a href="#" className="hover:text-white/60 transition-colors">GitHub</a>
            <span>vibeopc.app</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
    { platform: 'GitHub', url: 'https://github.com/mai' },
    { platform: 'Twitter', url: 'https://twitter.com/maidang' },
  ],
  commands: DEFAULT_COMMANDS,
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white/95">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#d97857] flex items-center justify-center text-sm font-bold text-white">V</div>
            <span className="text-base font-semibold tracking-tight">VibeOPC</span>
          </div>
          <Link
            href="/create"
            className="px-4 py-2 bg-[#d97857] hover:bg-[#e08a6b] text-white text-sm font-medium rounded-lg transition-colors"
          >
            开始创建
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-sm bg-[#d97857]/15 text-[#d97857] rounded-full border border-[#d97857]/20">
            <span>AI 时代的数字名片</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-tight">
            一条命令，让全世界了解你
          </h1>

          <p className="text-white/50 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            帮任何人快速生成专属 CLI 名片工具，让 AI / 他人只需一个命令就能了解你是谁、会什么、在哪里找到你。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link
              href="/create"
              className="px-6 py-2.5 bg-[#d97857] hover:bg-[#e08a6b] text-white text-sm font-medium rounded-lg transition-colors"
            >
              开始创建我的名片
            </Link>
            <button
              onClick={() => {
                navigator.clipboard.writeText('npx @vibeopc/demo');
              }}
              className="px-6 py-2.5 border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-sm font-medium rounded-lg transition-colors"
            >
              npx @vibeopc/demo →
            </button>
          </div>

          {/* Demo Terminal */}
          <div className="max-w-2xl mx-auto">
            <Terminal profile={DEMO_PROFILE} className="w-full" />
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-white/5 py-24">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-xl font-semibold text-center mb-12">为什么选择 VibeOPC？</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                <div className="text-2xl mb-4">🤖</div>
                <h3 className="font-semibold mb-2 text-sm">AI 时代的名片</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  让 Agent 快速了解你，一条命令获取你的全部信息，无需访问多个平台
                </p>
              </div>

              <div className="p-6 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                <div className="text-2xl mb-4">⚡</div>
                <h3 className="font-semibold mb-2 text-sm">30 秒生成</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  填写表单，实时预览，一键发布。无需编写代码，立即拥有专属 CLI
                </p>
              </div>

              <div className="p-6 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                <div className="text-2xl mb-4">🔗</div>
                <h3 className="font-semibold mb-2 text-sm">永久有效</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  基于 npm 包，永久可访问。随时更新信息，让名片与时俱进
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-t border-white/5 py-24">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-xl font-semibold text-center mb-12">适用人群</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { emoji: '🎨', title: 'KOL / 创作者', desc: '建立个人品牌，让粉丝一键了解你' },
                { emoji: '🚀', title: '副业者 / 一人公司', desc: '分散在多个平台？统一入口，方便建联' },
                { emoji: '🎮', title: 'AI 爱好者', desc: '好玩 + 有用，低门槛，有成就感' },
                { emoji: '💻', title: '独立开发者', desc: '技术圈的身份证明，展示你的项目和技能' },
              ].map((item) => (
                <div key={item.title} className="p-5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <div className="text-xl mb-3">{item.emoji}</div>
                  <h3 className="font-semibold mb-1 text-sm">{item.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 py-24">
          <div className="max-w-xl mx-auto px-6 text-center">
            <p className="text-white/40 text-sm mb-2">免费 · 快速 · 永久有效</p>
            <h2 className="text-xl font-semibold mb-6">立即创建你的专属 CLI 名片</h2>
            <Link
              href="/create"
              className="inline-block px-6 py-2.5 bg-[#d97857] hover:bg-[#e08a6b] text-white text-sm font-medium rounded-lg transition-colors"
            >
              开始创建 →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40">
            <div className="w-5 h-5 rounded bg-[#d97857] flex items-center justify-center text-xs font-bold text-white">V</div>
            <span className="text-sm font-medium">VibeOPC</span>
            <span className="text-xs">· AI 时代的数字名片</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">GitHub</a>
            <span>vibeopc.app</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { getSocialPlatformLabel, TemplateType, UserProfile } from '@/lib/types';

interface TerminalProps {
  profile: UserProfile;
  showCommandOutput?: string | null;
  onPreviewCommand?: (cmdName: string | null) => void;
  className?: string;
}

function renderFreeContent(content: string): string {
  return content;
}

function renderKeyValueContent(content: string): string {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : '暂无内容';
}

function renderListContent(content: string): string {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines.map((line) => `• ${line}`).join('\n') : '暂无内容';
}

function renderGroupListContent(content: string): string {
  const lines = content.split('\n');
  const rendered = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('## ')) return trimmed.slice(3);
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) return trimmed.slice(2, -2);
      if (trimmed.startsWith('- ')) return `  • ${trimmed.slice(2)}`;
      return `  ${trimmed}`;
    })
    .filter(Boolean);

  return rendered.length > 0 ? rendered.join('\n') : '暂无内容';
}

function renderMarkdownContent(content: string): string {
  const lines = content.split('\n');
  const rendered = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) return trimmed.slice(2, -2);
    if (trimmed.startsWith('- ')) return `• ${trimmed.slice(2)}`;
    return trimmed;
  });

  return rendered.filter(Boolean).join('\n') || '暂无内容';
}

function renderContentByTemplate(templateType: TemplateType, content: string): string {
  switch (templateType) {
    case 'keyvalue':
      return renderKeyValueContent(content);
    case 'list':
      return renderListContent(content);
    case 'grouplist':
      return renderGroupListContent(content);
    case 'markdown':
      return renderMarkdownContent(content);
    case 'free':
    default:
      return renderFreeContent(content);
  }
}

function getCommandOutput(profile: UserProfile, commandName: string): string {
  const cmd = profile.commands.find((c) => c.name === commandName);
  if (!cmd) return '命令不存在';

  if (cmd.content && cmd.content.trim()) {
    return renderContentByTemplate(cmd.templateType, cmd.content);
  }

  switch (commandName) {
    case 'whoami':
      return `姓名：${profile.name}\n位置：${profile.location || '未知'}\n简介：${profile.bio || '暂无简介'}\n\n如果你想了解更多，欢迎联系！`;
    case 'skills': return '暂无技能信息';
    case 'projects': return '暂无项目';
    case 'links':
      if (profile.socialLinks.length === 0) return '暂无链接';
      return profile.socialLinks.map((l) => `  - ${getSocialPlatformLabel(l.platform)}: ${l.url}`).join('\n');
    default:
      return cmd.content || '暂无内容';
  }
}

export default function Terminal({
  profile,
  showCommandOutput,
  onPreviewCommand,
  className = '',
}: TerminalProps) {
  const packageName = `@vibeopc/${profile.username || 'go'}`;
  const [lastLoginText, setLastLoginText] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLastLoginText(
        new Date().toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-white/8 ${className}`}
      style={{ background: 'var(--t-bg)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: 'var(--t-titlebar)', borderBottom: '1px solid var(--t-border)' }}
      >
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <div className="flex-1 text-center text-xs" style={{ color: 'var(--t-gray)' }}>
          {packageName} — bash
        </div>
      </div>

      {/* Content */}
      <div
        className="p-6 min-h-[360px] max-h-[500px] overflow-y-auto"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
      >
        {/* Last login */}
        <div className="text-xs mb-4" style={{ color: 'var(--t-gray)' }} suppressHydrationWarning>
          {lastLoginText ? `Last login: ${lastLoginText} on ttys000` : 'Last login: -- on ttys000'}
        </div>

        {/* Command prompt line */}
        <div className="flex items-center gap-2 mb-5 text-sm">
          <span style={{ color: '#c9d1d9' }}>➜</span>
          <span style={{ color: 'var(--t-green)', fontWeight: 600 }}>{packageName.split('/')[1]}</span>
          <span style={{ color: 'var(--t-gray)' }}>~</span>
          <span style={{ color: '#c9d1d9' }}>
            npx {packageName}{showCommandOutput ? ` ${showCommandOutput}` : ''}
          </span>
        </div>

        {showCommandOutput ? (
          // ── Command output view ──────────────────────────────
          <div className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--t-text)' }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--t-blue)' }}>
              <span>❯</span>
              <span>{showCommandOutput}</span>
              {onPreviewCommand && (
                <button
                  onClick={() => onPreviewCommand(null)}
                  className="ml-3 px-2.5 py-0.5 text-xs rounded-lg border transition-all"
                  style={{
                    color: 'var(--t-gray)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#c9d1d9';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--t-gray)';
                  }}
                >
                  ← 主菜单
                </button>
              )}
            </div>
            {getCommandOutput(profile, showCommandOutput)}
            <div className="mt-5 flex items-center gap-1" style={{ color: 'var(--t-gray)' }}>
              <span>❯</span>
              <span className="inline-block w-2 h-3 animate-blink" style={{ background: 'var(--t-text)' }} />
            </div>
          </div>
        ) : (
          // ── Main menu view ───────────────────────────────────
          <>
            <div className="mb-5">
              <div className="text-base font-semibold mb-1" style={{ color: 'var(--t-text)' }}>
                我是 {profile.name || '你的名字'}
              </div>
              <div className="text-sm" style={{ color: 'var(--t-gray)' }}>
                {profile.bio || '你的简介'}
                {profile.location && (
                  <span className="ml-2" style={{ color: 'var(--t-gray)' }}>· {profile.location}</span>
                )}
              </div>
            </div>

            <div className="mb-5" style={{ borderTop: '1px solid var(--t-divider)' }} />

            {/* Command list */}
            <div className="space-y-1 mb-5">
              {profile.commands.length > 0 ? (
                profile.commands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="group flex items-center gap-4 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ color: 'var(--t-text)' }}
                    onClick={() => onPreviewCommand && onPreviewCommand(cmd.name)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      className="font-medium min-w-[88px]"
                      style={{ color: 'var(--t-green)' }}
                    >
                      {cmd.name}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--t-gray)' }}>
                      {cmd.description}
                    </span>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-xs" style={{ color: 'var(--t-gray)' }}>
                      ↗
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-2 py-3 text-sm" style={{ color: 'var(--t-gray)' }}>
                  还没有命令。先在左侧用自然语言生成一个 CLI 草稿。
                </div>
              )}
            </div>

            <div className="mb-5" style={{ borderTop: '1px solid var(--t-divider)' }} />

            {/* Help hint */}
            <div className="flex items-center gap-2" style={{ color: 'var(--t-gray)' }}>
              <span>❯</span>
              <span className="text-sm">输入命令查看详情，如 npx {packageName} whoami</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

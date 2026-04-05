'use client';

import { UserProfile } from '@/lib/types';

interface TerminalProps {
  profile: UserProfile;
  /** command name to show output for, null = show main menu */
  showCommandOutput?: string | null;
  /** Called when user clicks the eye icon to preview a command */
  onPreviewCommand?: (cmdName: string | null) => void;
  className?: string;
}

function getCommandOutput(profile: UserProfile, commandName: string): string {
  const cmd = profile.commands.find((c) => c.name === commandName);
  if (!cmd) return '命令不存在';

  if (cmd.content && cmd.content.trim()) {
    return cmd.content;
  }

  // Default content when not configured
  switch (commandName) {
    case 'whoami':
      return `姓名：${profile.name}
位置：${profile.location || '未知'}
简介：${profile.bio || '暂无简介'}

如果你想了解更多，欢迎联系！`;
    case 'skills':
      return '暂无技能信息';
    case 'projects':
      return '暂无项目';
    case 'links':
      if (profile.socialLinks.length === 0) return '暂无链接';
      return profile.socialLinks.map((l) => `  - ${l.platform}: ${l.url}`).join('\n');
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
  const packageName = `@vibeopc/${profile.username || 'demo'}`;

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${className}`}
      style={{ background: '#0d1117' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ background: '#161b22', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <div className="flex-1 text-center text-xs" style={{ color: '#8b949e' }}>
          {packageName} — bash
        </div>
      </div>

      {/* Terminal content */}
      <div
        className="p-6 min-h-[340px] max-h-[480px] overflow-y-auto"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {/* Command prompt header */}
        <div className="mb-4">
          <div className="text-xs mb-2" style={{ color: '#8b949e' }}>
            Last login:{' '}
            {new Date().toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            on ttys000
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#c9d1d9' }}>➜</span>
            <span style={{ color: '#56d364', fontWeight: 500 }}>
              {packageName.split('/')[1]}
            </span>
            <span style={{ color: '#8b949e' }}>~</span>
            <span style={{ color: '#c9d1d9' }}>
              npx {packageName}
              {showCommandOutput ? ` ${showCommandOutput}` : ''}
            </span>
          </div>
        </div>

        {showCommandOutput ? (
          // Command output view
          <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c9d1d9' }}>
            <div className="mb-3 flex items-center gap-2" style={{ color: '#58a6ff' }}>
              <span>❯</span>
              <span>{showCommandOutput}</span>
              {onPreviewCommand && (
                <button
                  onClick={() => onPreviewCommand(null)}
                  className="ml-2 text-xs px-2 py-0.5 rounded border transition-colors"
                  style={{
                    color: '#8b949e',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#c9d1d9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#8b949e';
                  }}
                >
                  ← 返回菜单
                </button>
              )}
            </div>
            {getCommandOutput(profile, showCommandOutput)}
            <div className="mt-4" style={{ color: '#8b949e' }}>
              按 Ctrl+C 退出
            </div>
          </div>
        ) : (
          // Main menu view
          <>
            <div className="mb-5">
              <div className="text-lg font-semibold mb-1" style={{ color: '#c9d1d9' }}>
                我是 {profile.name || '你的名字'}
              </div>
              <div className="text-sm" style={{ color: '#8b949e' }}>
                {profile.bio || '你的简介'}
                {profile.location && <span className="ml-2">· {profile.location}</span>}
              </div>
            </div>

            <div className="mb-5" style={{ borderTop: '1px solid #30363d' }} />

            {/* Command menu */}
            <div className="space-y-1 mb-5">
              {profile.commands.map((cmd) => (
                <div key={cmd.id} className="flex items-center gap-3 text-sm group">
                  <span
                    className="font-medium min-w-[90px] cursor-pointer hover:underline"
                    style={{ color: '#56d364' }}
                    onClick={() => onPreviewCommand && onPreviewCommand(cmd.name)}
                    title="点击预览"
                  >
                    {cmd.name}
                  </span>
                  <span className="text-xs" style={{ color: '#8b949e' }}>
                    {cmd.description}
                  </span>
                  {onPreviewCommand && (
                    <button
                      onClick={() => onPreviewCommand(cmd.name)}
                      className="ml-auto text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: '#8b949e' }}
                      title="预览"
                    >
                      👁
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-5" style={{ borderTop: '1px solid #30363d' }} />

            {/* Blinking cursor */}
            <div className="flex items-center gap-1">
              <span style={{ color: '#58a6ff' }}>❯</span>
              <span className="inline-block w-2 h-4 animate-blink" style={{ background: '#c9d1d9' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

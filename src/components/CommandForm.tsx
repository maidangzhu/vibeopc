'use client';

import { UserProfile } from '@/lib/types';

interface CommandFormProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export default function CommandForm({ profile, onChange }: CommandFormProps) {
  const updateCommand = (id: string, field: 'description' | 'content', value: string) => {
    const commands = profile.commands.map((cmd) =>
      cmd.id === id
        ? { ...cmd, [field]: field === 'description' ? value : value }
        : cmd
    );
    onChange({ ...profile, commands });
  };

  const removeCommand = (id: string) => {
    if (profile.commands.length <= 1) return;
    onChange({ ...profile, commands: profile.commands.filter((cmd) => cmd.id !== id) });
  };

  const moveCommand = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= profile.commands.length) return;
    const commands = [...profile.commands];
    [commands[index], commands[newIndex]] = [commands[newIndex], commands[index]];
    onChange({ ...profile, commands });
  };

  // Built-in commands are protected from deletion
  const isProtected = (name: string) => ['whoami', 'links'].includes(name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          点击命令名称可直接预览效果
        </p>
      </div>

      <div className="space-y-3">
        {profile.commands.map((cmd, index) => (
          <div
            key={cmd.id}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <code
                  className="text-xs px-2 py-0.5 rounded-md font-mono"
                  style={{ background: 'rgba(86,211,100,0.08)', color: 'var(--t-green)' }}
                >
                  {cmd.name}
                </code>
                {isProtected(cmd.name) && (
                  <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>内置</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveCommand(index, 'up')}
                  disabled={index === 0}
                  className="btn-icon !w-7 !h-7 !text-xs disabled:opacity-20"
                  title="上移"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveCommand(index, 'down')}
                  disabled={index === profile.commands.length - 1}
                  className="btn-icon !w-7 !h-7 !text-xs disabled:opacity-20"
                  title="下移"
                >
                  ↓
                </button>
                {!isProtected(cmd.name) && (
                  <button
                    onClick={() => removeCommand(cmd.id)}
                    className="btn-icon !w-7 !h-7"
                    style={{ color: 'var(--t-red)' }}
                    title="删除"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label text-xs">菜单显示文字</label>
              <input
                type="text"
                value={cmd.description}
                onChange={(e) => updateCommand(cmd.id, 'description', e.target.value)}
                placeholder="关于我"
                className="input px-3 py-2 text-sm"
              />
            </div>

            {/* Content */}
            <div>
              <label className="label text-xs">
                {cmd.name === 'whoami' ? '固定内容（whoami 自动读取个人信息）' :
                 cmd.name === 'links' ? '固定内容（links 自动读取社交链接）' : '命令内容'}
              </label>
              <textarea
                value={cmd.content}
                onChange={(e) => updateCommand(cmd.id, 'content', e.target.value)}
                placeholder={
                  cmd.name === 'whoami' ? '此项内容自动从上方个人信息填充，无需填写' :
                  cmd.name === 'links' ? '此项内容自动从社交链接填充，无需填写' :
                  '输入命令执行后显示的内容...'
                }
                rows={4}
                className="input px-3 py-2 text-sm resize-none"
                readOnly={['whoami', 'links'].includes(cmd.name)}
                style={['whoami', 'links'].includes(cmd.name) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

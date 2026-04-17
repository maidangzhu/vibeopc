'use client';

import { TemplateType, UserProfile } from '@/lib/types';

interface CommandFormProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

const TEMPLATE_TYPE_OPTIONS: Array<{ value: TemplateType; label: string }> = [
  { value: 'markdown', label: '分段' },
  { value: 'list', label: '列表' },
  { value: 'keyvalue', label: '键值对' },
  { value: 'grouplist', label: '分组列表' },
  { value: 'free', label: '纯文本' },
];

function sanitizeCommandName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 20);
}

export default function CommandForm({ profile, onChange }: CommandFormProps) {
  const updateCommand = (
    id: string,
    field: 'name' | 'description' | 'content' | 'templateType',
    value: string
  ) => {
    const commands = profile.commands.map((cmd) =>
      cmd.id === id
        ? {
            ...cmd,
            [field]: field === 'name' ? sanitizeCommandName(value) : value,
          }
        : cmd
    );
    onChange({ ...profile, commands });
  };

  const addCommand = () => {
    onChange({
      ...profile,
      commands: [
        ...profile.commands,
        {
          id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${profile.commands.length + 1}`,
          name: `cmd-${profile.commands.length + 1}`,
          description: '新命令',
          content: '补充这个命令会输出的内容...',
          templateType: 'markdown',
        },
      ],
    });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          命令名、说明、布局类型和内容都可以继续调整
        </p>
        <button onClick={addCommand} className="btn btn-ghost px-3 py-1.5 text-xs">
          添加命令
        </button>
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
                  {cmd.name || 'new-command'}
                </code>
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
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label className="label text-xs">命令名</label>
                <input
                  type="text"
                  value={cmd.name}
                  onChange={(e) => updateCommand(cmd.id, 'name', e.target.value)}
                  placeholder="projects"
                  className="input px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-subtle)' }}>
                  仅支持小写字母、数字、下划线和连字符
                </p>
              </div>

              <div>
                <label className="label text-xs">展示方式</label>
                <select
                  value={cmd.templateType}
                  onChange={(e) => updateCommand(cmd.id, 'templateType', e.target.value)}
                  className="input px-3 py-2 text-sm"
                >
                  {TEMPLATE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
              <label className="label text-xs">命令内容</label>
              <textarea
                value={cmd.content}
                onChange={(e) => updateCommand(cmd.id, 'content', e.target.value)}
                placeholder="输入命令执行后显示的内容..."
                rows={4}
                className="input px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

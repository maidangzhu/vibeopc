'use client';

import { Command, UserProfile, TemplateType } from '@/lib/types';

const TEMPLATE_TYPE_OPTIONS: { value: TemplateType; label: string; hint: string }[] = [
  { value: 'free', label: '自由文本', hint: '原样输出，支持 emoji' },
  { value: 'keyvalue', label: '键值对', hint: 'label: value 格式' },
  { value: 'list', label: '列表', hint: '每行一个条目' },
  { value: 'grouplist', label: '分组列表', hint: '多级分组，带标题' },
  { value: 'markdown', label: 'Markdown', hint: '粗体、列表、标题' },
];

interface CommandFormProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export default function CommandForm({ profile, onChange }: CommandFormProps) {
  const updateCommand = (id: string, field: keyof Command, value: string) => {
    const commands = profile.commands.map((cmd) =>
      cmd.id === id ? { ...cmd, [field]: field === 'name' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value } : cmd
    );
    onChange({ ...profile, commands });
  };

  const updateTemplateType = (id: string, templateType: TemplateType) => {
    const commands = profile.commands.map((cmd) =>
      cmd.id === id ? { ...cmd, templateType } : cmd
    );
    onChange({ ...profile, commands });
  };

  const addCommand = () => {
    const newId = Date.now().toString();
    onChange({
      ...profile,
      commands: [...profile.commands, { id: newId, name: 'newcmd', description: '新命令', content: '', templateType: 'free' }],
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">命令配置</h2>
        <button
          onClick={addCommand}
          className="px-3 py-1.5 text-sm rounded-lg transition-colors"
          style={{ color: '#d97857', border: '1px solid rgba(217,120,87,0.3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217,120,87,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          + 添加命令
        </button>
      </div>

      <p className="text-xs" style={{ color: '#8b949e' }}>
        每个命令对应终端中的一项菜单，点击后可显示详细内容
      </p>

      <div className="space-y-3">
        {profile.commands.map((cmd, index) => (
          <div
            key={cmd.id}
            className="p-4 rounded-xl space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: '#8b949e' }}>
                命令 #{index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveCommand(index, 'up')}
                  disabled={index === 0}
                  className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-20"
                  style={{ color: '#8b949e' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveCommand(index, 'down')}
                  disabled={index === profile.commands.length - 1}
                  className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-20"
                  style={{ color: '#8b949e' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  ↓
                </button>
                <button
                  onClick={() => removeCommand(cmd.id)}
                  disabled={profile.commands.length <= 1}
                  className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-20"
                  style={{ color: '#d97857' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217,120,87,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  删除
                </button>
              </div>
            </div>

            {/* Command name */}
            <div>
              <label className="label text-xs">命令名</label>
              <input
                type="text"
                value={cmd.name}
                onChange={(e) => updateCommand(cmd.id, 'name', e.target.value)}
                placeholder="whoami"
                className="input w-full px-3 py-2 text-sm"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label text-xs">菜单描述</label>
              <input
                type="text"
                value={cmd.description}
                onChange={(e) => updateCommand(cmd.id, 'description', e.target.value)}
                placeholder="关于我"
                className="input w-full px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs" style={{ color: '#8b949e' }}>终端菜单中显示的文字</p>
            </div>

            {/* Content */}
            <div>
              <label className="label text-xs">命令内容</label>
              <textarea
                value={cmd.content}
                onChange={(e) => updateCommand(cmd.id, 'content', e.target.value)}
                placeholder="输入命令执行后显示的内容..."
                rows={4}
                className="input w-full px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* Template type */}
            <div>
              <label className="label text-xs">渲染模式</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateTemplateType(cmd.id, opt.value)}
                    title={opt.hint}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                    style={{
                      background: cmd.templateType === opt.value ? 'rgba(217,120,87,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: cmd.templateType === opt.value ? 'rgba(217,120,87,0.4)' : 'rgba(255,255,255,0.08)',
                      color: cmd.templateType === opt.value ? '#d97857' : '#8b949e',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs" style={{ color: '#8b949e' }}>
                {TEMPLATE_TYPE_OPTIONS.find((o) => o.value === cmd.templateType)?.hint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

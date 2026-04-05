'use client';

import { UserProfile, SOCIAL_PLATFORMS } from '@/lib/types';

interface ProfileFormProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export default function ProfileForm({ profile, onChange }: ProfileFormProps) {
  const update = (field: keyof UserProfile, value: string) => {
    onChange({ ...profile, [field]: value });
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const links = [...profile.socialLinks];
    links[index] = { ...links[index], [field]: value };
    onChange({ ...profile, socialLinks: links });
  };

  const addSocialLink = () => {
    onChange({ ...profile, socialLinks: [...profile.socialLinks, { platform: 'github', url: '' }] });
  };

  const removeSocialLink = (index: number) => {
    onChange({ ...profile, socialLinks: profile.socialLinks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">个人信息</h2>

      {/* Username */}
      <div>
        <label className="label">
          Username <span style={{ color: '#d97857' }}>*</span>
        </label>
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
        >
          <span className="px-3 py-2.5 text-sm" style={{ color: '#8b949e', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            @
          </span>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="yourname"
            className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
            style={{ color: '#e6edf3' }}
          />
        </div>
        <p className="mt-1.5 text-xs" style={{ color: '#8b949e' }}>
          你的命令：npx @vibeopc/{profile.username || 'yourname'}
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="label">
          姓名 <span style={{ color: '#d97857' }}>*</span>
        </label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="麦当"
          className="input w-full px-3 py-2.5 text-sm"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="label">一句话介绍</label>
        <input
          type="text"
          value={profile.bio}
          onChange={(e) => update('bio', e.target.value)}
          placeholder="全栈工程师 / AI 爱好者 / 独立开发者"
          className="input w-full px-3 py-2.5 text-sm"
        />
      </div>

      {/* Location */}
      <div>
        <label className="label">位置</label>
        <input
          type="text"
          value={profile.location}
          onChange={(e) => update('location', e.target.value)}
          placeholder="杭州"
          className="input w-full px-3 py-2.5 text-sm"
        />
      </div>

      {/* Avatar URL */}
      <div>
        <label className="label">头像 URL</label>
        <input
          type="url"
          value={profile.avatarUrl}
          onChange={(e) => update('avatarUrl', e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="input w-full px-3 py-2.5 text-sm"
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-5">
        <h2 className="text-base font-semibold mb-4">社交链接</h2>

        <div className="space-y-2">
          {profile.socialLinks.map((link, index) => (
            <div key={index} className="flex gap-2 items-center">
              <select
                value={link.platform}
                onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                className="input px-2 py-2 text-sm"
                style={{ width: '130px', flexShrink: 0 }}
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value} style={{ background: '#1a1a1a' }}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                placeholder="https://github.com/username"
                className="input flex-1 px-3 py-2 text-sm"
              />
              <button
                onClick={() => removeSocialLink(index)}
                className="px-3 py-2 text-xs rounded-lg transition-colors flex-shrink-0"
                style={{ color: '#d97857' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217,120,87,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                删除
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addSocialLink}
          className="mt-3 px-4 py-2 text-sm rounded-lg transition-colors"
          style={{ color: '#d97857', border: '1px solid rgba(217,120,87,0.3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217,120,87,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          + 添加链接
        </button>
      </div>
    </div>
  );
}

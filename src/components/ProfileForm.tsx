'use client';

import { useState, useEffect, useRef } from 'react';
import { UserProfile, SOCIAL_PLATFORMS } from '@/lib/types';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

interface ProfileFormProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  /** 初始用户名（来自 URL params），自己的用户名不触发冲突警告 */
  initialUsername?: string;
  onUsernameTakenChange?: (taken: boolean) => void;
}

export default function ProfileForm({
  profile,
  onChange,
  initialUsername,
  onUsernameTakenChange,
}: ProfileFormProps) {
  const [availability, setAvailability] = useState<{
    username: string;
    status: Exclude<UsernameStatus, 'checking'>;
  }>({
    username: '',
    status: 'idle',
  });
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmedUsername = profile.username.trim();
  const shouldCheckUsername =
    Boolean(trimmedUsername) &&
    trimmedUsername !== initialUsername &&
    /^[a-z0-9_-]+$/.test(trimmedUsername);

  const usernameStatus: UsernameStatus = (() => {
    if (!shouldCheckUsername) return 'idle';
    if (availability.username !== trimmedUsername) return 'checking';
    return availability.status;
  })();

  // Debounced username availability check
  useEffect(() => {
    if (!shouldCheckUsername) {
      onUsernameTakenChange?.(false);
      return;
    }
    if (checkTimer.current) clearTimeout(checkTimer.current);

    const currentUsername = trimmedUsername;
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/${currentUsername}`);
        if (res.ok) {
          setAvailability({ username: currentUsername, status: 'taken' });
          onUsernameTakenChange?.(true);
        } else {
          setAvailability({ username: currentUsername, status: 'available' });
          onUsernameTakenChange?.(false);
        }
      } catch {
        setAvailability({ username: currentUsername, status: 'error' });
        onUsernameTakenChange?.(false);
      }
    }, 400);

    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [trimmedUsername, shouldCheckUsername, onUsernameTakenChange]);

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
      {/* Username */}
      <div>
        <label className="label">Username <span>*</span></label>
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <span
            className="px-3.5 py-2.5 text-sm font-mono"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--border)' }}
          >
            @
          </span>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="yourname"
            className="flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none font-mono"
            style={{ color: 'var(--text)' }}
            autoComplete="off"
            spellCheck={false}
          />
          {/* Availability indicator */}
          {usernameStatus === 'checking' && (
            <span className="pr-3 flex-shrink-0">
              <span className="spinner" style={{ width: 14, height: 14 }} />
            </span>
          )}
          {usernameStatus === 'available' && (
            <span className="pr-3 flex-shrink-0" title="用户名可用" style={{ color: 'var(--t-green)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
          {usernameStatus === 'taken' && (
            <span className="pr-3 flex-shrink-0" title="用户名已被占用" style={{ color: 'var(--t-red)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          )}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
          {usernameStatus === 'taken' ? (
            <span style={{ color: 'var(--t-red)' }}>用户名已被占用，请换一个</span>
          ) : usernameStatus === 'available' ? (
            <>你的命令：<span className="font-mono" style={{ color: 'var(--t-green)' }}>npx @vibeopc/{profile.username}</span></>
          ) : (
            <>你的命令：<span className="font-mono" style={{ color: 'var(--t-green)' }}>npx @vibeopc/{profile.username || 'yourname'}</span></>
          )}
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="label">姓名 <span>*</span></label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="麦当"
          className="input px-3.5 py-2.5 text-sm"
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
          className="input px-3.5 py-2.5 text-sm"
          maxLength={100}
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
          className="input px-3.5 py-2.5 text-sm"
        />
      </div>

      {/* Divider */}
      <hr className="divider" />

      {/* Social links */}
      <div>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>社交链接</h2>
        <div className="space-y-2">
          {profile.socialLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={link.platform}
                onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                className="input px-3 py-2 text-sm"
                style={{ width: '120px', flexShrink: 0 }}
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
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
                className="btn-icon flex-shrink-0"
                title="删除链接"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addSocialLink}
          className="mt-3 flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加链接
        </button>
      </div>
    </div>
  );
}

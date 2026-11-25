import React from 'react';
import { AvatarPresetId } from '../../types/auth';

export interface AvatarPresetMeta {
  id: AvatarPresetId;
  label: string;
  gradient: string;
  ring: string;
}

export const AVATAR_PRESETS: AvatarPresetMeta[] = [
  {
    id: 'violet',
    label: 'Violet Prism',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
    ring: 'rgba(139, 92, 246, 0.48)',
  },
  {
    id: 'cyan',
    label: 'Cyan Orbit',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)',
    ring: 'rgba(6, 182, 212, 0.48)',
  },
  {
    id: 'indigo',
    label: 'Nebula Fusion',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
    ring: 'rgba(99, 102, 241, 0.48)',
  },
  {
    id: 'emerald',
    label: 'Emerald Pulse',
    gradient: 'linear-gradient(135deg, #10B981 0%, #0891B2 100%)',
    ring: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'amber',
    label: 'Solar Horizon',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
    ring: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'rose',
    label: 'Rose Quartz',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #8B5CF6 100%)',
    ring: 'rgba(244, 63, 94, 0.45)',
  },
];

export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AvatarBadgeProps {
  avatarId: AvatarPresetId;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 text-xs rounded-xl',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-14 h-14 text-lg rounded-2xl',
};

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  avatarId,
  displayName,
  size = 'md',
  className = '',
}) => {
  const preset = AVATAR_PRESETS.find((p) => p.id === avatarId) ?? AVATAR_PRESETS[0];
  return (
    <div
      aria-hidden="true"
      className={`font-display font-semibold text-white flex items-center justify-center shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
      style={{
        backgroundImage: preset.gradient,
        boxShadow: `0 6px 18px -6px ${preset.ring}, inset 0 1px 0 0 rgba(255,255,255,0.28)`,
      }}
    >
      {getInitials(displayName)}
    </div>
  );
};

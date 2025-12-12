import { Wand2, Leaf, Star, Heart, Compass, Crown, Flame, Bird, LucideIcon } from 'lucide-react';

export interface AvatarConfig {
  bg: string;
  icon: LucideIcon;
  label: string;
}

export const DEFAULT_AVATARS: AvatarConfig[] = [
  { bg: 'bg-indigo-500', icon: Wand2, label: '魔法师' },
  { bg: 'bg-emerald-500', icon: Leaf, label: '探险家' },
  { bg: 'bg-amber-500', icon: Star, label: '星语者' },
  { bg: 'bg-rose-500', icon: Heart, label: '梦想家' },
  { bg: 'bg-cyan-500', icon: Compass, label: '航海者' },
  { bg: 'bg-purple-500', icon: Crown, label: '统治者' },
  { bg: 'bg-orange-500', icon: Flame, label: '炼金师' },
  { bg: 'bg-sky-500', icon: Bird, label: '云游者' },
];

/**
 * 根据用户名哈希值自动分配头像
 */
export const getAvatarByUsername = (username: string): AvatarConfig => {
  // 计算用户名的简单哈希值
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // 根据哈希值选择头像
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length];
};

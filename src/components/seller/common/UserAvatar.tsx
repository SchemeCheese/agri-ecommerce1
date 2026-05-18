"use client";

import React, { useState } from 'react';
import { resolveBackendUrl } from '@/lib/runtime-config';

type UserLike = {
  full_name?: string | null;
  email?: string | null;
  avatar?: string | null;
} | null | undefined;

interface UserAvatarProps {
  user: UserLike;
  size?: number;
  className?: string;
}

/**
 * Initials rule (per spec):
 *  1. full_name → first letter of first part + first letter of last part (max 2)
 *  2. fallback to first 2 chars of email
 *  3. fallback to "U"
 */
export function getUserInitials(user: UserLike): string {
  const name = user?.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const email = user?.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

/**
 * Resolve the avatar source URL.
 *  - absolute http(s) URL → use as-is (Google photoURL, external CDN)
 *  - relative path → prefix with backend base
 *  - empty / null → return null so caller renders initials
 */
function resolveAvatarUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return resolveBackendUrl(t);
}

export function UserAvatar({ user, size = 36, className = '' }: UserAvatarProps) {
  const url = resolveAvatarUrl(user?.avatar);
  const initials = getUserInitials(user);
  const [errored, setErrored] = useState(false);

  if (url && !errored) {
    return (
      // Plain <img> instead of next/image: Google's lh3.googleusercontent.com URLs
      // 404 randomly through the Next image optimizer, and "no-referrer" is required
      // or googleusercontent will return 403.
      <img
        src={url}
        alt={user?.full_name || 'User'}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className={`rounded-full object-cover bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.38)) }}
      aria-label={user?.full_name || user?.email || 'User'}
    >
      {initials}
    </div>
  );
}

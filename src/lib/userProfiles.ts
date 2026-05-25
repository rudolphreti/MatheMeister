import { loadProfileForUser } from './storage';
import { ProfileV1 } from './types';

export function resolveProfileForSelectedUser(userName: string, fallback: ProfileV1): ProfileV1 {
  const safeName = userName.trim();
  if (!safeName) return fallback;
  const existing = loadProfileForUser(safeName);
  if (!existing) return { ...fallback, userName: safeName };
  return { ...existing, userName: safeName };
}

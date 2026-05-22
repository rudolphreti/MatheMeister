import { ProfileV1 } from './types';

export const STORAGE_KEY = 'math-practice-app:v1';

export function saveProfile(profile: ProfileV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadProfile(): ProfileV1 | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isProfileV1(parsed)) return normalizeProfile(parsed);
  } catch {}
  return null;
}

function normalizeProfile(profile: ProfileV1): ProfileV1 {
  return {
    ...profile,
    session: {
      ...profile.session,
      sessionEndsAt: profile.session.sessionEndsAt ?? (profile.session.sessionStartAt ? profile.session.sessionStartAt + profile.session.sessionDurationMs : null),
    },
  };
}

export function isProfileV1(x: unknown): x is ProfileV1 {
  if (!x || typeof x !== 'object') return false;
  const y = x as ProfileV1;
  return y.schemaVersion === 1
    && !!y.settings
    && !!y.session
    && !!y.problemStats
    && ('sessionEndsAt' in y.session ? (typeof y.session.sessionEndsAt === 'number' || y.session.sessionEndsAt === null) : true);
}

export function exportProfile(profile: ProfileV1): string {
  return JSON.stringify(profile, null, 2);
}

export function importProfile(json: string): ProfileV1 {
  const parsed = JSON.parse(json);
  if (!isProfileV1(parsed)) throw new Error('Invalid schema');
  return normalizeProfile(parsed);
}

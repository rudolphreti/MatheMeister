import { ProfileV1 } from './types';

export const STORAGE_KEY = 'math-practice-app:v1';
export const LAST_USER_NAME_KEY = 'math-practice-app:last-user-name';

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export function saveProfile(profile: ProfileV1) {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function saveLastUserName(name: string) {
  getStorage()?.setItem(LAST_USER_NAME_KEY, name.trim());
}

export function loadLastUserName(): string {
  return (getStorage()?.getItem(LAST_USER_NAME_KEY) ?? '').trim();
}

export function loadProfile(): ProfileV1 | null {
  if (!getStorage()) return null;
  const raw = getStorage()?.getItem(STORAGE_KEY);
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
    userName: profile.userName ?? '',
    leaderboard: (profile.leaderboard ?? []).slice().sort((a, b) => b.coins - a.coins || b.completedAt - a.completedAt),
    settings: {
      ...profile.settings,
      examplesPerSession: profile.settings.examplesPerSession ?? 10,
      excludeResultZero: profile.settings.excludeResultZero ?? false,
      excludePlusMinusZero: profile.settings.excludePlusMinusZero ?? false,
      excludePlusMinusOne: profile.settings.excludePlusMinusOne ?? false,
    },
    session: {
      ...profile.session,
      sessionEndsAt: profile.session.sessionEndsAt ?? (profile.session.sessionStartAt ? profile.session.sessionStartAt + profile.session.sessionDurationMs : null),
    },
  };
}

export function isProfileV1(x: unknown): x is ProfileV1 {
  if (!x || typeof x !== 'object') return false;
  const y = x as ProfileV1;
  if (y.schemaVersion !== 1) return false;
  if (!isSettings(y.settings)) return false;
  if (typeof y.userName !== 'string') return false;
  if (!Array.isArray(y.leaderboard)) return false;
  if (!y.leaderboard.every((entry) => entry && typeof entry.userName === 'string' && Number.isInteger(entry.coins) && Number.isFinite(entry.completedAt))) return false;
  if (!isSession(y.session)) return false;
  if (!isProblemStats(y.problemStats)) return false;
  return true;
}

function isSettings(x: unknown): x is ProfileV1['settings'] {
  if (!x || typeof x !== 'object') return false;
  const y = x as ProfileV1['settings'];
  return (y.mode === 'timed' || y.mode === 'no-pressure')
    && [1, 3, 5, 10, 15].includes(y.sessionMinutes)
    && Number.isInteger(y.min)
    && [5, 10, 20].includes(y.max)
    && typeof y.additionEnabled === 'boolean'
    && typeof y.subtractionEnabled === 'boolean'
    && [2, 3, 4, 5].includes(y.terms)
    && typeof y.soundEnabled === 'boolean'
    && y.language === 'de'
    && (y.examplesPerSession === undefined || (Number.isInteger(y.examplesPerSession) && y.examplesPerSession >= 1 && y.examplesPerSession <= 200))
    && (y.excludeResultZero === undefined || typeof y.excludeResultZero === 'boolean')
    && (y.excludePlusMinusZero === undefined || typeof y.excludePlusMinusZero === 'boolean')
    && (y.excludePlusMinusOne === undefined || typeof y.excludePlusMinusOne === 'boolean');
}

function isProblem(x: unknown): x is NonNullable<ProfileV1['session']['activeProblem']> {
  if (!x || typeof x !== 'object') return false;
  const y = x as NonNullable<ProfileV1['session']['activeProblem']>;
  return typeof y.key === 'string' && typeof y.expression === 'string' && Number.isFinite(y.answer);
}

function isSession(x: unknown): x is ProfileV1['session'] {
  if (!x || typeof x !== 'object') return false;
  const y = x as ProfileV1['session'];
  return (y.activeProblem === null || isProblem(y.activeProblem))
    && typeof y.typedAnswer === 'string'
    && (y.sessionStartAt === null || Number.isFinite(y.sessionStartAt))
    && (y.sessionEndsAt === null || Number.isFinite(y.sessionEndsAt))
    && Number.isFinite(y.sessionDurationMs)
    && Number.isInteger(y.coins)
    && !!y.currentStats
    && Number.isInteger(y.currentStats.correct)
    && Number.isInteger(y.currentStats.wrong)
    && ['practice', 'settings', 'stats', 'problem-stats'].includes(y.lastScreen);
}

function isProblemStat(x: unknown): x is ProfileV1['problemStats'][string] {
  if (!x || typeof x !== 'object') return false;
  const y = x as ProfileV1['problemStats'][string];
  return typeof y.key === 'string'
    && typeof y.expression === 'string'
    && Number.isInteger(y.attempts)
    && Number.isInteger(y.correct)
    && Number.isInteger(y.wrong)
    && Number.isFinite(y.averageResponseTimeMs)
    && Number.isFinite(y.difficultyScore)
    && Number.isFinite(y.lastSeenAt);
}

function isProblemStats(x: unknown): x is ProfileV1['problemStats'] {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  return Object.values(x).every(isProblemStat);
}

export function exportProfile(profile: ProfileV1): string {
  return JSON.stringify(profile, null, 2);
}

export function importProfile(json: string): ProfileV1 {
  const parsed = JSON.parse(json);
  if (!isProfileV1(parsed)) throw new Error('Invalid schema');
  return normalizeProfile(parsed);
}

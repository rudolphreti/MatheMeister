import { ProfileV1 } from './types';

export const STORAGE_KEY = 'math-practice-app:v1';
export const LAST_USER_NAME_KEY = 'math-practice-app:last-user-name';
export const USER_PROFILES_KEY = 'math-practice-app:user-profiles:v1';

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  if (typeof localStorage.getItem !== 'function') return null;
  if (typeof localStorage.setItem !== 'function') return null;
  return localStorage;
}

export function saveProfile(profile: ProfileV1) {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(profile));
  saveProfileForUser(profile.userName, profile);
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

export function saveProfileForUser(userName: string, profile: ProfileV1) {
  const safeName = userName.trim();
  if (!safeName) return;
  const storage = getStorage();
  if (!storage) return;
  const profiles = loadAllUserProfiles();
  profiles[safeName] = profile;
  storage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
}

export function loadProfileForUser(userName: string): ProfileV1 | null {
  const safeName = userName.trim();
  if (!safeName) return null;
  const profile = loadAllUserProfiles()[safeName];
  if (!profile || !isProfileV1(profile)) return null;
  return normalizeProfile(profile);
}


export function loadUserNames(): string[] {
  return Object.keys(loadAllUserProfiles())
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

function loadAllUserProfiles(): Record<string, ProfileV1> {
  const storage = getStorage();
  if (!storage) return {};
  const raw = storage.getItem(USER_PROFILES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ProfileV1>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function normalizeProfile(profile: ProfileV1): ProfileV1 {
  const normalizedSubtractionMinuendMin = Math.max(profile.settings.min, Math.min(profile.settings.max, Math.floor(profile.settings.subtractionMinuendMin ?? profile.settings.min ?? 0)));
  const normalizedSubtractionMinuendMax = Math.max(normalizedSubtractionMinuendMin, Math.min(profile.settings.max, Math.floor(profile.settings.subtractionMinuendMax ?? 20)));
  return {
    ...profile,
    userName: profile.userName ?? '',
    leaderboard: (profile.leaderboard ?? []).slice().sort((a, b) => b.coins - a.coins || b.completedAt - a.completedAt),
    settings: {
      ...profile.settings,
      subtractionMinuendMin: normalizedSubtractionMinuendMin,
      subtractionMinuendMax: normalizedSubtractionMinuendMax,
      examplesPerSession: profile.settings.examplesPerSession ?? 10,
      excludeResultZero: profile.settings.excludeResultZero ?? false,
      excludePlusMinusZero: profile.settings.excludePlusMinusZero ?? false,
      excludePlusMinusOne: profile.settings.excludePlusMinusOne ?? false,
      customTasksText: profile.settings.customTasksText ?? '',
    },
    problemStats: Object.fromEntries(Object.entries(profile.problemStats ?? {}).map(([key, value]) => [key, { ...value, errorDebt: value.errorDebt ?? 0, lastSeenAt: value.lastSeenAt ?? null, lastSeenTurn: value.lastSeenTurn ?? null, excluded: value.excluded ?? false }])),
    session: {
      ...profile.session,
      problemStartedAt: profile.session.problemStartedAt ?? null,
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
    && (y.subtractionMinuendMin === undefined || (Number.isInteger(y.subtractionMinuendMin) && y.subtractionMinuendMin >= y.min && y.subtractionMinuendMin <= y.max))
    && (y.subtractionMinuendMax === undefined || (Number.isInteger(y.subtractionMinuendMax) && y.subtractionMinuendMax >= y.min && y.subtractionMinuendMax <= y.max))
    && (y.subtractionMinuendMin === undefined || y.subtractionMinuendMax === undefined || y.subtractionMinuendMin <= y.subtractionMinuendMax)
    && [2, 3, 4, 5].includes(y.terms)
    && typeof y.soundEnabled === 'boolean'
    && y.language === 'de'
    && (y.examplesPerSession === undefined || (Number.isInteger(y.examplesPerSession) && y.examplesPerSession >= 1 && y.examplesPerSession <= 200))
    && (y.excludeResultZero === undefined || typeof y.excludeResultZero === 'boolean')
    && (y.excludePlusMinusZero === undefined || typeof y.excludePlusMinusZero === 'boolean')
    && (y.excludePlusMinusOne === undefined || typeof y.excludePlusMinusOne === 'boolean')
    && (y.customTasksText === undefined || typeof y.customTasksText === 'string');
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
    && (y.problemStartedAt === undefined || y.problemStartedAt === null || Number.isFinite(y.problemStartedAt))
    && (y.sessionStartAt === null || Number.isFinite(y.sessionStartAt))
    && (y.sessionEndsAt === null || Number.isFinite(y.sessionEndsAt))
    && Number.isFinite(y.sessionDurationMs)
    && Number.isInteger(y.coins)
    && !!y.currentStats
    && Number.isInteger(y.currentStats.correct)
    && Number.isInteger(y.currentStats.wrong)
    && ['practice', 'settings', 'stats', 'problem-stats', 'operations-overview'].includes(y.lastScreen);
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
    && (y.errorDebt === undefined || Number.isInteger(y.errorDebt))
    && (y.lastSeenAt === null || Number.isFinite(y.lastSeenAt))
    && (y.lastSeenTurn === undefined || y.lastSeenTurn === null || Number.isInteger(y.lastSeenTurn))
    && (y.excluded === undefined || typeof y.excluded === 'boolean');
}

function isProblemStats(x: unknown): x is ProfileV1['problemStats'] {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  return Object.values(x).every(isProblemStat);
}

export function exportProfile(profile: ProfileV1): string {
  return JSON.stringify(profile, null, 2);
}


export function clearAllAppData() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LAST_USER_NAME_KEY);
  storage.removeItem(USER_PROFILES_KEY);
}

export function importProfile(json: string): ProfileV1 {
  const parsed = JSON.parse(json);
  if (!isProfileV1(parsed)) throw new Error('Invalid schema');
  return normalizeProfile(parsed);
}

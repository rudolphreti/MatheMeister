import { describe, expect, it } from 'vitest';
import { listStoredUserNames, saveProfileForUser } from '../src/lib/storage';
import { resolveProfileForSelectedUser } from '../src/lib/userProfiles';
import { ProfileV1 } from '../src/lib/types';

const profile: ProfileV1 = {
  schemaVersion: 1, userName: '', leaderboard: [], settings: { mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true, subtractionMinuendMin: 0, subtractionMinuendMax: 20, terms: 2, soundEnabled: true, language: 'de', examplesPerSession: 10, excludeResultZero: false, excludePlusMinusZero: false, excludePlusMinusOne: false, customTasksText: '' },
  session: { activeProblem: null, typedAnswer: '', problemStartedAt: null, sessionStartAt: null, sessionEndsAt: null, sessionDurationMs: 0, coins: 0, currentStats: { correct: 0, wrong: 0 }, blockedProblemKeys: [], algorithmLog: [], lastScreen: 'practice' },
  problemStats: {}
};

describe('user profile selection helpers', () => {
  it('lists stored users sorted', () => {
    const memory = new Map<string, string>();
    const previousStorage = (globalThis as { localStorage?: Storage }).localStorage;
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
      clear: () => memory.clear(),
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
      get length() { return memory.size; }
    } as Storage;

    saveProfileForUser('Zoe', { ...profile, userName: 'Zoe' });
    saveProfileForUser('Anna', { ...profile, userName: 'Anna' });
    expect(listStoredUserNames()).toEqual(['Anna', 'Zoe']);

    (globalThis as { localStorage?: Storage }).localStorage = previousStorage;
  });

  it('resolves existing or new user profile', () => {
    const resolved = resolveProfileForSelectedUser('New User', profile);
    expect(resolved.userName).toBe('New User');
  });
});

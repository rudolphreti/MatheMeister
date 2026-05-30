import { describe, it, expect } from 'vitest';
import { clearAllAppData, importProfile, exportProfile, loadLastUserName, loadProfileForUser, loadUserNames, saveLastUserName, saveProfileForUser } from '../src/lib/storage';

const profile = { schemaVersion:1, userName:'Anna', leaderboard:[], settings:{ mode:'timed', sessionMinutes:10, min:0, additionMaxResult:20, additionEnabled:true, subtractionEnabled:true, subtractionDidacticGroups:['minuendGreaterThanTenSubtrahendLessThanTenResultLessThanTen', 'minuendGreaterThanTenSubtrahendLessThanTenResultGreaterThanTen', 'bothTermsAtLeastTen', 'bothTermsAtMostTen'], terms:2, soundEnabled:true, language:'de', examplesPerSession:10, excludeResultZero:false, excludePlusMinusZero:false, excludePlusMinusOne:false, customTasksText:"" }, session:{ activeProblem:null, typedAnswer:'', problemStartedAt:null, sessionStartAt:null, sessionEndsAt:null, sessionDurationMs:0, coins:0, currentStats:{correct:0,wrong:0}, lastScreen:'practice' }, problemStats:{} };

describe('storage', () => {
  it('roundtrip', () => { const out = importProfile(exportProfile(profile as never)); expect(out.schemaVersion).toBe(1); });
  it('rejects invalid settings', () => {
    const broken = { ...profile, settings: { ...profile.settings, additionMaxResult: 999 } };
    expect(() => importProfile(JSON.stringify(broken))).toThrow();
  });
  it('normalizes missing subtraction didactic groups to all groups', () => {
    const legacy = { ...profile, settings: { ...profile.settings, subtractionDidacticGroups: undefined } };
    const out = importProfile(JSON.stringify(legacy));
    expect(out.settings.additionMaxResult).toBe(20);
    expect(out.settings.subtractionDidacticGroups).toEqual(['minuendGreaterThanTenSubtrahendLessThanTenResultLessThanTen', 'minuendGreaterThanTenSubtrahendLessThanTenResultGreaterThanTen', 'bothTermsAtLeastTen', 'bothTermsAtMostTen']);
  });
  it('rejects invalid problemStats rows', () => {
    const broken = { ...profile, problemStats: { '1+1': { key: '1+1', expression: '1 + 1', attempts: 'oops' } } };
    expect(() => importProfile(JSON.stringify(broken))).toThrow();
  });
  it('last user name helpers are safe without browser storage', () => {
    expect(() => saveLastUserName('  Anna  ')).not.toThrow();
    expect(loadLastUserName()).toBe('');
  });
  it('keeps independent per-user profile stats', () => {
    const memory = new Map<string, string>();
    const previousStorage = (globalThis as { localStorage?: Storage }).localStorage;
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
      get length() { return memory.size; }
    } as Storage;

    const anna = {
      ...profile,
      userName: 'Anna',
      problemStats: {
        '1+1': { key: '1+1', expression: '1 + 1', attempts: 3, correct: 2, wrong: 1, averageResponseTimeMs: 1200, difficultyScore: 1.1, errorDebt: 1, lastSeenAt: 1700000000000, lastSeenTurn: 2, excluded: false }
      }
    };
    const max = {
      ...profile,
      userName: 'Max',
      problemStats: {
        '2+2': { key: '2+2', expression: '2 + 2', attempts: 5, correct: 5, wrong: 0, averageResponseTimeMs: 900, difficultyScore: 0.2, errorDebt: 0, lastSeenAt: 1700000000001, lastSeenTurn: 4, excluded: false }
      }
    };

    saveProfileForUser('Anna', anna as never);
    saveProfileForUser('Max', max as never);

    expect(loadUserNames()).toEqual(['Anna', 'Max']);
    expect(loadProfileForUser('Anna')?.problemStats['1+1']?.attempts).toBe(3);
    expect(loadProfileForUser('Anna')?.problemStats['2+2']).toBeUndefined();
    expect(loadProfileForUser('Max')?.problemStats['2+2']?.attempts).toBe(5);
    expect(loadProfileForUser('Max')?.problemStats['1+1']).toBeUndefined();

    (globalThis as { localStorage?: Storage }).localStorage = previousStorage;
  });

  it('returns sorted user names from user profile storage', () => {
    const memory = new Map<string, string>();
    const previousStorage = (globalThis as { localStorage?: Storage }).localStorage;
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
      get length() { return memory.size; }
    } as Storage;

    memory.set('math-practice-app:user-profiles:v1', JSON.stringify({ Zofia: profile, Adam: profile }));
    expect(loadUserNames()).toEqual(['Adam', 'Zofia']);

    (globalThis as { localStorage?: Storage }).localStorage = previousStorage;
  });

  it('clears all application keys', () => {
    const memory = new Map<string, string>();
    const previousStorage = (globalThis as { localStorage?: Storage }).localStorage;
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
      get length() { return memory.size; }
    } as Storage;

    memory.set('math-practice-app:v1', '{"some":"profile"}');
    memory.set('math-practice-app:last-user-name', 'Anna');
    memory.set('math-practice-app:user-profiles:v1', '{"Anna":{}}');
    memory.set('other-key', 'keep');

    clearAllAppData();

    expect(memory.get('math-practice-app:v1')).toBeUndefined();
    expect(memory.get('math-practice-app:last-user-name')).toBeUndefined();
    expect(memory.get('math-practice-app:user-profiles:v1')).toBeUndefined();
    expect(memory.get('other-key')).toBe('keep');

    (globalThis as { localStorage?: Storage }).localStorage = previousStorage;
  });
});

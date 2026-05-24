import { describe, it, expect } from 'vitest';
import { importProfile, exportProfile, loadLastUserName, saveLastUserName } from '../src/lib/storage';

const profile = { schemaVersion:1, userName:'Anna', leaderboard:[], settings:{ mode:'timed', sessionMinutes:10, min:0, max:20, additionEnabled:true, subtractionEnabled:true, terms:2, soundEnabled:true, language:'de', examplesPerSession:10, excludeResultZero:false, excludePlusMinusZero:false, excludePlusMinusOne:false, customTasksText:"" }, session:{ activeProblem:null, typedAnswer:'', problemStartedAt:null, sessionStartAt:null, sessionEndsAt:null, sessionDurationMs:0, coins:0, currentStats:{correct:0,wrong:0}, lastScreen:'practice' }, problemStats:{} };

describe('storage', () => {
  it('roundtrip', () => { const out = importProfile(exportProfile(profile as never)); expect(out.schemaVersion).toBe(1); });
  it('rejects invalid settings', () => {
    const broken = { ...profile, settings: { ...profile.settings, max: 999 } };
    expect(() => importProfile(JSON.stringify(broken))).toThrow();
  });
  it('rejects invalid problemStats rows', () => {
    const broken = { ...profile, problemStats: { '1+1': { key: '1+1', expression: '1 + 1', attempts: 'oops' } } };
    expect(() => importProfile(JSON.stringify(broken))).toThrow();
  });
  it('last user name helpers are safe without browser storage', () => {
    expect(() => saveLastUserName('  Anna  ')).not.toThrow();
    expect(loadLastUserName()).toBe('');
  });
});

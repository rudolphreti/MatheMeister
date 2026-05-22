import { describe, it, expect } from 'vitest';
import { importProfile, exportProfile } from '../src/lib/storage';

const profile = { schemaVersion:1, settings:{ mode:'timed', sessionMinutes:10, min:0, max:20, additionEnabled:true, subtractionEnabled:true, terms:2, soundEnabled:true, language:'de' }, session:{ activeProblem:null, typedAnswer:'', sessionStartAt:null, sessionEndsAt:null, sessionDurationMs:0, coins:0, currentStats:{correct:0,wrong:0}, lastScreen:'practice' }, problemStats:{} };

describe('storage', () => {
  it('roundtrip', () => { const out = importProfile(exportProfile(profile as never)); expect(out.schemaVersion).toBe(1); });
});

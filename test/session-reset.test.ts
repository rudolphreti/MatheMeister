import { describe, expect, it } from 'vitest';
import { buildSessionStartState } from '../src/lib/appModel';
import { ProfileV1 } from '../src/lib/types';

const profile: ProfileV1 = {
  schemaVersion: 1,
  userName: 'Anna',
  leaderboard: [],
  settings: {
    mode: 'timed',
    sessionMinutes: 10,
    min: 0,
    max: 20,
    additionEnabled: true,
    subtractionEnabled: true,
    subtractionMinuendMin: 0,
    subtractionMinuendMax: 20,
    terms: 2,
    soundEnabled: true,
    language: 'de',
    examplesPerSession: 10,
    excludeResultZero: false,
    excludePlusMinusZero: false,
    excludePlusMinusOne: false,
    customTasksText: ''
  },
  session: {
    activeProblem: null,
    typedAnswer: '42',
    problemStartedAt: 1,
    sessionStartAt: 1,
    sessionEndsAt: 2,
    sessionDurationMs: 600000,
    coins: 99,
    currentStats: { correct: 8, wrong: 2 },
    blockedProblemKeys: ['1+1'],
    algorithmLog: ['old'],
    lastScreen: 'practice'
  },
  problemStats: {}
};

describe('buildSessionStartState', () => {
  it('always resets coins to zero for a new session', () => {
    const session = buildSessionStartState(profile, 1700000000000, null);
    expect(session.coins).toBe(0);
    expect(session.currentStats).toEqual({ correct: 0, wrong: 0 });
    expect(session.typedAnswer).toBe('');
  });
});

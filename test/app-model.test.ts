import { describe, expect, it } from 'vitest';
import { maybeAppendLeaderboardEntry, parseBinaryOperation, sortLeaderboard } from '../src/lib/appModel';
import { ProfileV1 } from '../src/lib/types';

const defaultProfile: ProfileV1 = {
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
    typedAnswer: '',
    problemStartedAt: null,
    sessionStartAt: null,
    sessionEndsAt: null,
    sessionDurationMs: 600000,
    coins: 7,
    currentStats: { correct: 3, wrong: 1 },
    blockedProblemKeys: [],
    algorithmLog: [],
    lastScreen: 'practice'
  },
  problemStats: {}
};

describe('appModel leaderboard', () => {
  it('appends leaderboard entry for finished session with user name', () => {
    const updated = maybeAppendLeaderboardEntry(defaultProfile, false, true, 1700000000000);
    expect(updated.leaderboard).toHaveLength(1);
    expect(updated.leaderboard[0]).toMatchObject({ userName: 'Anna', coins: 7, completedAt: 1700000000000 });
  });

  it('does not append twice when already ended before', () => {
    const once = maybeAppendLeaderboardEntry(defaultProfile, false, true, 1700000000000);
    const twice = maybeAppendLeaderboardEntry(once, true, true, 1700000000001);
    expect(twice.leaderboard).toHaveLength(1);
  });

  it('does not append when there are no solved examples', () => {
    const profile = { ...defaultProfile, session: { ...defaultProfile.session, currentStats: { correct: 0, wrong: 0 } } };
    const updated = maybeAppendLeaderboardEntry(profile, false, true, 1700000000000);
    expect(updated.leaderboard).toHaveLength(0);
  });
});

describe('appModel helpers', () => {
  it('sorts leaderboard by coins desc then completedAt desc', () => {
    const sorted = sortLeaderboard([
      { userName: 'A', coins: 10, completedAt: 1 },
      { userName: 'B', coins: 12, completedAt: 1 },
      { userName: 'C', coins: 10, completedAt: 2 }
    ]);
    expect(sorted.map((x) => x.userName)).toEqual(['B', 'C', 'A']);
  });

  it('parses binary operation with optional explicit result', () => {
    expect(parseBinaryOperation('2 + 3')).toMatchObject({ left: 2, right: 3, operator: '+', result: 5 });
    expect(parseBinaryOperation('7 - 2 = 5')).toMatchObject({ left: 7, right: 2, operator: '-', result: 5 });
    expect(parseBinaryOperation('abc')).toBeNull();
  });
});

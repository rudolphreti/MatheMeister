import { describe, it, expect } from 'vitest';
import {
  appendAlgorithmLog,
  buildCorrectionQueue,
  getCorrectionProgress,
  buildSessionStateForUserStart,
  buildSessionStateBeforeStart,
  buildProfileForSessionReset,
  blockProblemForCurrentSession,
  buildNextProblemPool,
  ensureActiveProblemIsAllowed,
  moveSkippedProblemToQueueEnd,
  finalizeSessionResults,
  shouldShowCorrectionAction
} from '../src/lib/session';
import { Problem } from '../src/lib/types';
import { ProfileV1 } from '../src/lib/types';

const p1: Problem = { key: '1+1', expression: '1 + 1', answer: 2 };
const p2: Problem = { key: '2+2', expression: '2 + 2', answer: 4 };
const p3: Problem = { key: '3+3', expression: '3 + 3', answer: 6 };

describe('ensureActiveProblemIsAllowed', () => {
  it('returns true when there is no active problem', () => {
    expect(ensureActiveProblemIsAllowed(null, [p1, p2])).toBe(true);
  });

  it('returns true when pool is empty', () => {
    expect(ensureActiveProblemIsAllowed(p1, [])).toBe(true);
  });

  it('returns true when active problem exists in allowed pool', () => {
    expect(ensureActiveProblemIsAllowed(p1, [p1, p2])).toBe(true);
  });

  it('returns false when active problem is excluded from allowed pool', () => {
    expect(ensureActiveProblemIsAllowed(p1, [p2])).toBe(false);
  });
});

describe('moveSkippedProblemToQueueEnd', () => {
  it('moves active problem key to queue end', () => {
    expect(moveSkippedProblemToQueueEnd(['1+1', '2+2', '3+3'], '1+1')).toEqual(['2+2', '3+3', '1+1']);
  });

  it('keeps queue unchanged when active key is missing', () => {
    expect(moveSkippedProblemToQueueEnd(['1+1', '2+2'], '9+9')).toEqual(['1+1', '2+2']);
  });

  it('keeps queue unchanged when active key is duplicated', () => {
    expect(moveSkippedProblemToQueueEnd(['1+1', '2+2', '1+1'], '1+1')).toEqual(['1+1', '2+2', '1+1']);
  });
});

describe('correction queue helpers', () => {
  it('builds unique correction queue from wrong attempts only', () => {
    expect(buildCorrectionQueue([
      { key: '1+1', correct: false },
      { key: '2+2', correct: true },
      { key: '1+1', correct: false },
      { key: '3+3', correct: false }
    ])).toEqual(['1+1', '3+3']);
  });

  it('returns progress tuple for correction mode', () => {
    expect(getCorrectionProgress(['1+1', '2+2', '3+3'], ['1+1'])).toEqual({ solved: 1, total: 3, remaining: 2 });
  });
});



describe('shouldShowCorrectionAction', () => {
  it('shows correction action when there are unsolved correction tasks', () => {
    expect(shouldShowCorrectionAction(['1+1', '2+2'], ['1+1'])).toBe(true);
  });

  it('hides correction action when correction queue is empty', () => {
    expect(shouldShowCorrectionAction([], [])).toBe(false);
  });

  it('hides correction action when all correction tasks are solved', () => {
    expect(shouldShowCorrectionAction(['1+1', '2+2'], ['1+1', '2+2'])).toBe(false);
  });
});


describe('session algorithm helpers', () => {
  it('blocks wrong problem only once and keeps previous blocks', () => {
    expect(blockProblemForCurrentSession([], '1+1')).toEqual(['1+1']);
    expect(blockProblemForCurrentSession(['1+1'], '1+1')).toEqual(['1+1']);
    expect(blockProblemForCurrentSession(['1+1'], '2+2')).toEqual(['1+1', '2+2']);
  });

  it('builds next pool without blocked problems', () => {
    expect(buildNextProblemPool([p1, p2], ['1+1']).map((p) => p.key)).toEqual(['2+2']);
  });

  it('keeps at least one problem when all are blocked', () => {
    expect(buildNextProblemPool([p1], ['1+1']).map((p) => p.key)).toEqual(['1+1']);
  });

  it('appends timestamped log lines', () => {
    const next = appendAlgorithmLog([], 'selected 2+2', 1700000000000);
    expect(next).toHaveLength(1);
    expect(next[0]).toContain('selected 2+2');
    expect(next[0]).toContain('2023');
  });
});



describe('session backward compatibility', () => {
  it('appendAlgorithmLog handles missing legacy log array', () => {
    const result = appendAlgorithmLog(undefined as unknown as string[], 'event', 1700000000000);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('event');
  });

  it('blockProblemForCurrentSession handles missing legacy blocked array', () => {
    expect(blockProblemForCurrentSession(undefined as unknown as string[], '1+1')).toEqual(['1+1']);
  });
});

describe('buildSessionStateForUserStart', () => {
  const baseProfile: ProfileV1 = {
    schemaVersion: 1,
    userName: 'Ada',
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
      examplesPerSession: 12,
      excludeResultZero: false,
      excludePlusMinusZero: false,
      excludePlusMinusOne: false,
      customTasksText: ''
    },
    session: {
      activeProblem: p1,
      typedAnswer: '42',
      problemStartedAt: 1,
      sessionStartAt: 1,
      sessionEndsAt: 2,
      sessionDurationMs: 3,
      coins: 7,
      currentStats: { correct: 4, wrong: 5 },
      blockedProblemKeys: ['1+1'],
      algorithmLog: ['legacy'],
      sessionAttempts: [],
      correctionQueue: [],
      correctionSolvedKeys: [],
      correctionModeActive: false,
      lastScreen: 'stats'
    },
    problemStats: {}
  };

  it('resets active session counters and returns to practice screen for timed mode', () => {
    const started = buildSessionStateForUserStart(baseProfile, 1000, 60000);
    expect(started.currentStats).toEqual({ correct: 0, wrong: 0 });
    expect(started.coins).toBe(0);
    expect(started.blockedProblemKeys).toEqual([]);
    expect(started.lastScreen).toBe('practice');
    expect(started.sessionStartAt).toBe(1000);
    expect(started.sessionEndsAt).toBe(61000);
    expect(started.algorithmLog).toHaveLength(1);
  });

  it('starts no-pressure mode without end time', () => {
    const noPressure = { ...baseProfile, settings: { ...baseProfile.settings, mode: 'no-pressure' as const } };
    const started = buildSessionStateForUserStart(noPressure, 1000, 60000);
    expect(started.sessionStartAt).toBe(1000);
    expect(started.sessionEndsAt).toBeNull();
  });
});

describe('buildSessionStateBeforeStart', () => {
  it('prepares clean practice screen with explicit start required', () => {
    const profile: ProfileV1 = {
      schemaVersion: 1,
      userName: 'Ada',
      leaderboard: [],
      settings: {
        mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true,
        subtractionMinuendMin: 0, subtractionMinuendMax: 20, terms: 2, soundEnabled: true, language: 'de',
        examplesPerSession: 10, excludeResultZero: false, excludePlusMinusZero: false, excludePlusMinusOne: false, customTasksText: ''
      },
      session: { activeProblem: p1, typedAnswer: '7', problemStartedAt: 10, sessionStartAt: 10, sessionEndsAt: 20, sessionDurationMs: 5, coins: 3, currentStats: { correct: 1, wrong: 2 }, blockedProblemKeys: ['1+1'], algorithmLog: ['x'], sessionAttempts: [], correctionQueue: [], correctionSolvedKeys: [], correctionModeActive: false, lastScreen: 'stats' },
      problemStats: {}
    };

    const next = buildSessionStateBeforeStart(profile, 60000);
    expect(next.activeProblem).toBeNull();
    expect(next.sessionStartAt).toBeNull();
    expect(next.currentStats).toEqual({ correct: 0, wrong: 0 });
    expect(next.coins).toBe(0);
    expect(next.lastScreen).toBe('practice');
  });
});

describe('buildProfileForSessionReset', () => {
  it('returns startup-like profile with preserved settings only', () => {
    const defaultProfile: ProfileV1 = {
      schemaVersion: 1,
      userName: '',
      leaderboard: [],
      settings: {
        mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true,
        subtractionMinuendMin: 0, subtractionMinuendMax: 20, terms: 2, soundEnabled: true, language: 'de',
        examplesPerSession: 10, excludeResultZero: false, excludePlusMinusZero: false, excludePlusMinusOne: false, customTasksText: ''
      },
      session: { activeProblem: null, typedAnswer: '', problemStartedAt: null, sessionStartAt: null, sessionEndsAt: null, sessionDurationMs: 600000, coins: 0, currentStats: { correct: 0, wrong: 0 }, blockedProblemKeys: [], algorithmLog: [], sessionAttempts: [], correctionQueue: [], correctionSolvedKeys: [], correctionModeActive: false, lastScreen: 'practice' },
      problemStats: {}
    };
    const current: ProfileV1 = {
      ...defaultProfile,
      userName: 'Ada',
      leaderboard: [{ userName: 'Ada', coins: 99, completedAt: 100 }],
      settings: { ...defaultProfile.settings, mode: 'no-pressure', examplesPerSession: 25 },
      session: { ...defaultProfile.session, coins: 10, lastScreen: 'stats', activeProblem: p1 },
      problemStats: { '1+1': { key: '1+1', expression: '1+1', attempts: 1, correct: 1, wrong: 0, averageResponseTimeMs: 1000, difficultyScore: 0, errorDebt: 0, lastSeenAt: 1, lastSeenTurn: 1, excluded: false } }
    };

    const resetProfile = buildProfileForSessionReset(current, defaultProfile);
    expect(resetProfile.userName).toBe('');
    expect(resetProfile.leaderboard).toEqual([]);
    expect(resetProfile.session.activeProblem).toBeNull();
    expect(resetProfile.session.coins).toBe(0);
    expect(resetProfile.settings.mode).toBe('no-pressure');
    expect(resetProfile.settings.examplesPerSession).toBe(25);
  });
});

describe('finalizeSessionResults', () => {
  const statA = { key: '1+1', expression: '1+1', attempts: 1, correct: 1, wrong: 0, averageResponseTimeMs: 1000, difficultyScore: 0.1, errorDebt: 0, lastSeenAt: 1, lastSeenTurn: 1, excluded: false };
  const statB = { key: '2+2', expression: '2+2', attempts: 2, correct: 1, wrong: 1, averageResponseTimeMs: 2000, difficultyScore: 0.2, errorDebt: 1, lastSeenAt: 2, lastSeenTurn: 2, excluded: false };

  it('persists pending stats and appends ranking row once when session has attempts', () => {
    const result = finalizeSessionResults({
      profileProblemStats: { '1+1': statA },
      pendingProblemStats: { '2+2': statB },
      leaderboard: [{ userName: 'Ada', coins: 1, completedAt: 10 }],
      userName: 'Ada',
      sessionCoins: 5,
      sessionAttemptsCount: 3,
      alreadyFinalized: false,
      now: 20
    });

    expect(result.problemStats).toEqual({ '1+1': statA, '2+2': statB });
    expect(result.finalized).toBe(true);
    expect(result.leaderboard).toEqual([
      { userName: 'Ada', coins: 5, completedAt: 20 },
      { userName: 'Ada', coins: 1, completedAt: 10 }
    ]);
  });

  it('does not append another ranking row when already finalized', () => {
    const result = finalizeSessionResults({
      profileProblemStats: {},
      pendingProblemStats: { '2+2': statB },
      leaderboard: [{ userName: 'Ada', coins: 5, completedAt: 20 }],
      userName: 'Ada',
      sessionCoins: 5,
      sessionAttemptsCount: 3,
      alreadyFinalized: true,
      now: 30
    });

    expect(result.leaderboard).toEqual([{ userName: 'Ada', coins: 5, completedAt: 20 }]);
    expect(result.problemStats).toEqual({ '2+2': statB });
    expect(result.finalized).toBe(true);
  });
});

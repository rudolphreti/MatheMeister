import { ProblemStat, ProfileV1 } from './types';

export function sortLeaderboard(rows: ProfileV1['leaderboard']) {
  return rows.slice().sort((a, b) => b.coins - a.coins || b.completedAt - a.completedAt);
}

export function mergeProblemStats(base: Record<string, ProblemStat>, pending: Record<string, ProblemStat>): Record<string, ProblemStat> {
  return { ...base, ...pending };
}

export function sortStats(stats: Record<string, ProblemStat>): ProblemStat[] {
  return Object.values(stats).sort((a, b) => b.difficultyScore - a.difficultyScore
    || b.wrong - a.wrong
    || b.averageResponseTimeMs - a.averageResponseTimeMs
    || a.key.localeCompare(b.key));
}

export function parseBinaryOperation(expression: string): { left: number; right: number; operator: '+' | '-'; result: number } | null {
  const match = expression.match(/^\s*(\d+)\s*([+-])\s*(\d+)(?:\s*=\s*(-?\d+))?\s*$/);
  if (!match) return null;
  const left = Number(match[1]);
  const operator = match[2] as '+' | '-';
  const right = Number(match[3]);
  const computed = operator === '+' ? left + right : left - right;
  const result = match[4] !== undefined ? Number(match[4]) : computed;
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(result)) return null;
  return { left, right, operator, result };
}

export function maybeAppendLeaderboardEntry(profile: ProfileV1, previouslyEnded: boolean, currentlyEnded: boolean, now = Date.now()): ProfileV1 {
  if (previouslyEnded || !currentlyEnded) return profile;
  const hasName = profile.userName.trim().length > 0;
  const solved = profile.session.currentStats.correct + profile.session.currentStats.wrong;
  if (!hasName || solved <= 0) return profile;

  return {
    ...profile,
    leaderboard: sortLeaderboard([
      ...profile.leaderboard,
      { userName: profile.userName.trim(), coins: profile.session.coins, completedAt: now }
    ])
  };
}


export function buildSessionStartState(profile: ProfileV1, startAt: number, activeProblem: ProfileV1['session']['activeProblem']) {
  const durationMs = profile.settings.sessionMinutes * 60000;
  return {
    ...profile.session,
    activeProblem,
    problemStartedAt: startAt,
    typedAnswer: '',
    sessionStartAt: profile.settings.mode === 'timed' ? startAt : null,
    sessionEndsAt: profile.settings.mode === 'timed' ? startAt + durationMs : null,
    sessionDurationMs: durationMs,
    coins: 0,
    currentStats: { correct: 0, wrong: 0 },
    blockedProblemKeys: []
  };
}

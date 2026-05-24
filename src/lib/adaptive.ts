import { Problem, ProblemStat, Settings } from './types';
import { buildProblemPool } from './math';

export type PriorityGroup = 'errorDebt' | 'neverSeen' | 'slowSolved' | 'fallback';

export interface SelectionSessionState {
  previousProblemKey?: string;
  turnNumber: number;
  consecutiveErrorDebtSelections: number;
}

const FAST_MS = 3000;
const MEDIUM_MS = 6000;
const SLOW_MS = 10000;
const MAX_RECORDED_RESPONSE_MS = 30000;
const MAX_WEIGHTED_RESPONSE_MS = 20000;

export function buildAllProblems(settings: Settings): Problem[] { return buildProblemPool(settings); }
export function isValidForSettings(problem: Problem, settings: Settings): boolean {
  return buildProblemPool(settings).some((candidate) => candidate.key === problem.key);
}
export function isExcluded(problem: Problem, stats: Record<string, ProblemStat>): boolean { return !!stats[problem.key]?.excluded; }
export function buildEligibleProblemPool(settings: Settings, stats: Record<string, ProblemStat>): Problem[] {
  return buildAllProblems(settings).filter((p) => !isExcluded(p, stats));
}

export function calculateComplexityScore(problem: Problem): number {
  const terms = problem.expression.split(' ').filter((part) => /^\d+$/.test(part)).map(Number);
  const hasSubtraction = problem.expression.includes('-');
  const result = problem.answer;
  const crosses10 = terms.some((value) => value > 10) || result > 10;
  return (crosses10 ? 1 : 0) + (hasSubtraction ? 1 : 0) + (terms.some((n) => n > 10) ? 1 : 0) + Math.max(0, terms.length - 2) + (result > 10 ? 1 : 0);
}

export function calculateProblemWeight(problem: Problem, stats: Record<string, ProblemStat>, priorityGroup: PriorityGroup): number {
  const stat = stats[problem.key];
  if (priorityGroup === 'errorDebt') return 10 + (stat?.errorDebt ?? 0) * 10 + (stat?.wrong ?? 0) * 3 + (stat?.difficultyScore ?? 0);
  if (priorityGroup === 'neverSeen') return Math.max(1, 10 - calculateComplexityScore(problem));
  if (priorityGroup === 'slowSolved') return 1 + Math.min(stat?.averageResponseTimeMs ?? 0, MAX_WEIGHTED_RESPONSE_MS) / 1000;
  return 1;
}

export function weightedRandomPick(items: Problem[], getWeight: (problem: Problem) => number): Problem {
  const weights = items.map((item) => Math.max(0.0001, getWeight(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;
  for (let index = 0; index < items.length; index++) {
    random -= weights[index];
    if (random <= 0) return items[index];
  }
  return items[items.length - 1];
}

export function selectNextProblem(eligibleProblems: Problem[], stats: Record<string, ProblemStat>, sessionState: SelectionSessionState): Problem {
  const errorDebt = eligibleProblems.filter((problem) => (stats[problem.key]?.errorDebt ?? 0) > 0);
  const neverSeen = eligibleProblems.filter((problem) => !stats[problem.key] || stats[problem.key].attempts === 0);
  const slowSolved = eligibleProblems.filter((problem) => (stats[problem.key]?.attempts ?? 0) > 0);

  const useMonotonyBreak = sessionState.consecutiveErrorDebtSelections >= 4 && neverSeen.length > 0;
  let selectedGroup: PriorityGroup = 'fallback';
  let source = eligibleProblems;
  if (useMonotonyBreak) {
    selectedGroup = 'neverSeen'; source = neverSeen;
  } else if (errorDebt.length > 0) {
    selectedGroup = 'errorDebt'; source = errorDebt;
  } else if (neverSeen.length > 0) {
    selectedGroup = 'neverSeen'; source = neverSeen;
  } else if (slowSolved.length > 0) {
    selectedGroup = 'slowSolved'; source = slowSolved;
  }

  const antiRepeat = source.length > 1 && sessionState.previousProblemKey ? source.filter((problem) => problem.key !== sessionState.previousProblemKey) : source;
  const finalPool = antiRepeat.length > 0 ? antiRepeat : source;
  return weightedRandomPick(finalPool, (problem) => calculateProblemWeight(problem, stats, selectedGroup));
}

export function coinReward(ms: number, correct: boolean): number {
  if (!correct) return 0;
  const normalizedMs = Number.isFinite(ms) ? Math.max(0, ms) : Number.POSITIVE_INFINITY;
  if (normalizedMs < FAST_MS) return 5;
  if (normalizedMs < MEDIUM_MS) return 3;
  if (normalizedMs < SLOW_MS) return 2;
  return 1;
}

export function updateProblemStatsAfterAnswer(existing: ProblemStat | undefined, p: Problem, isCorrect: boolean, responseTimeMs: number, now: number, turn: number | null = null): ProblemStat {
  const base: ProblemStat = existing ?? { key: p.key, expression: p.expression, attempts: 0, correct: 0, wrong: 0, averageResponseTimeMs: 0, difficultyScore: 0, errorDebt: 0, lastSeenAt: null, lastSeenTurn: null, excluded: false };
  const clampedMs = Math.min(Math.max(0, responseTimeMs), MAX_RECORDED_RESPONSE_MS);
  const attempts = base.attempts + 1;
  const averageResponseTimeMs = Math.round(((base.averageResponseTimeMs * base.attempts) + clampedMs) / attempts);
  let difficultyScore = base.difficultyScore;
  if (!isCorrect) difficultyScore += 5;
  else if (clampedMs >= SLOW_MS) difficultyScore += 2;
  else if (clampedMs < FAST_MS) difficultyScore -= 2;
  else difficultyScore -= 1;
  difficultyScore = Math.max(0, Math.min(50, difficultyScore));
  const errorDebt = isCorrect ? Math.max(0, base.errorDebt - 1) : base.errorDebt + 1;
  return { ...base, attempts, correct: base.correct + (isCorrect ? 1 : 0), wrong: base.wrong + (isCorrect ? 0 : 1), averageResponseTimeMs, difficultyScore, errorDebt, lastSeenAt: now, lastSeenTurn: turn };
}

export function updateProblemStat(existing: ProblemStat | undefined, p: Problem, correct: boolean, ms: number, now: number): ProblemStat {
  return updateProblemStatsAfterAnswer(existing, p, correct, ms, now);
}

export function pickWeightedProblem(pool: Problem[], stats: Record<string, ProblemStat>, prevKey?: string): Problem {
  return selectNextProblem(pool, stats, { previousProblemKey: prevKey, turnNumber: 0, consecutiveErrorDebtSelections: 0 });
}

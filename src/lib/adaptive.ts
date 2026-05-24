import { Problem, ProblemStat } from './types';

export function pickWeightedProblem(
  pool: Problem[],
  stats: Record<string, ProblemStat>,
  prevKey?: string,
  customProblemKeys: Set<string> = new Set()
): Problem {
  const filtered = pool.length > 1 ? pool.filter((p) => p.key !== prevKey) : pool;
  const arr = filtered.length ? filtered : pool;
  const weights = arr.map((p) => getProblemWeight(p, stats, customProblemKeys));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}


function isEasyCustomTask(stat: ProblemStat | undefined): boolean {
  if (!stat) return false;
  if (stat.attempts < 3) return false;
  const wrongRate = stat.attempts > 0 ? stat.wrong / stat.attempts : 0;
  return wrongRate <= 0.1 && stat.averageResponseTimeMs < 3000;
}

function getProblemWeight(p: Problem, stats: Record<string, ProblemStat>, customProblemKeys: Set<string>): number {
  const stat = stats[p.key];
  const difficulty = stat?.difficultyScore ?? 0;
  const wrong = stat?.wrong ?? 0;
  const avgMs = stat?.averageResponseTimeMs ?? 0;
  let weight = 1 + difficulty + wrong * 0.5 + Math.min(4, avgMs / 3000);

  if (customProblemKeys.has(p.key)) {
    weight *= 1.35;
    if (isEasyCustomTask(stat)) weight *= 0.35;
  }

  return Math.max(0.1, weight);
}

const FAST_MS = 3000;
const MEDIUM_MS = 6000;
const SLOW_MS = 10000;

export function coinReward(ms: number, correct: boolean): number {
  if (!correct) return 0;

  const normalizedMs = Number.isFinite(ms) ? Math.max(0, ms) : Number.POSITIVE_INFINITY;

  if (normalizedMs < FAST_MS) return 5;
  if (normalizedMs < MEDIUM_MS) return 3;
  if (normalizedMs < SLOW_MS) return 2;
  return 1;
}

export function updateProblemStat(existing: ProblemStat | undefined, p: Problem, correct: boolean, ms: number, now: number): ProblemStat {
  const base: ProblemStat = existing ?? {
    key: p.key,
    expression: p.expression,
    attempts: 0,
    correct: 0,
    wrong: 0,
    averageResponseTimeMs: 0,
    difficultyScore: 0,
    lastSeenAt: now
  };
  const attempts = base.attempts + 1;
  const averageResponseTimeMs = Math.round(((base.averageResponseTimeMs * base.attempts) + ms) / attempts);
  let difficultyScore = base.difficultyScore;
  if (!correct) difficultyScore += 5;
  else if (ms > 6000) difficultyScore += 2;
  else if (ms < 3000) difficultyScore -= 2;
  else difficultyScore -= 1;
  difficultyScore = Math.max(0, Math.min(50, difficultyScore));
  return {
    ...base,
    attempts,
    correct: base.correct + (correct ? 1 : 0),
    wrong: base.wrong + (correct ? 0 : 1),
    averageResponseTimeMs,
    difficultyScore,
    lastSeenAt: now
  };
}

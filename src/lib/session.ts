import { Problem } from './types';

export function moveSkippedProblemToQueueEnd(queue: string[], activeProblemKey: string): string[] {
  const matchingKeys = queue.filter((key) => key === activeProblemKey);
  if (matchingKeys.length !== 1) return queue;

  const nextQueue = queue.filter((key) => key !== activeProblemKey);
  nextQueue.push(activeProblemKey);
  return nextQueue;
}


export function ensureActiveProblemIsAllowed(
  activeProblem: Problem | null,
  allowedProblems: Problem[]
): boolean {
  if (!activeProblem) return true;
  if (allowedProblems.length === 0) return true;
  return allowedProblems.some((problem) => problem.key === activeProblem.key);
}


export function blockProblemForCurrentSession(blockedProblemKeys: string[], problemKey: string): string[] {
  if (!problemKey) return blockedProblemKeys;
  if (blockedProblemKeys.includes(problemKey)) return blockedProblemKeys;
  return [...blockedProblemKeys, problemKey];
}

export function buildNextProblemPool(allProblems: Problem[], blockedProblemKeys: string[]): Problem[] {
  const blocked = new Set(blockedProblemKeys);
  const filtered = allProblems.filter((problem) => !blocked.has(problem.key));
  return filtered.length > 0 ? filtered : allProblems;
}

export function appendAlgorithmLog(currentLog: string[], message: string, now: number = Date.now()): string[] {
  const stamp = new Date(now).toISOString();
  return [...currentLog, `[${stamp}] ${message}`];
}

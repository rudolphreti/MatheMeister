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

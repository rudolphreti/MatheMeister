import { Problem } from './types';

export function ensureActiveProblemIsAllowed(
  activeProblem: Problem | null,
  allowedProblems: Problem[]
): boolean {
  if (!activeProblem) return true;
  if (allowedProblems.length === 0) return true;
  return allowedProblems.some((problem) => problem.key === activeProblem.key);
}

import { Problem } from './types';
import { ProfileV1 } from './types';

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


export function blockProblemForCurrentSession(blockedProblemKeys: string[] | null | undefined, problemKey: string): string[] {
  const safeBlockedKeys = Array.isArray(blockedProblemKeys) ? blockedProblemKeys : [];
  if (!problemKey) return safeBlockedKeys;
  if (safeBlockedKeys.includes(problemKey)) return safeBlockedKeys;
  return [...safeBlockedKeys, problemKey];
}

export function buildNextProblemPool(allProblems: Problem[], blockedProblemKeys: string[] | null | undefined): Problem[] {
  const safeBlockedKeys = Array.isArray(blockedProblemKeys) ? blockedProblemKeys : [];
  const blocked = new Set(safeBlockedKeys);
  const filtered = allProblems.filter((problem) => !blocked.has(problem.key));
  return filtered.length > 0 ? filtered : allProblems;
}

export function appendAlgorithmLog(currentLog: string[] | null | undefined, message: string, now: number = Date.now()): string[] {
  const safeLog = Array.isArray(currentLog) ? currentLog : [];
  const stamp = new Date(now).toISOString();
  return [...safeLog, `[${stamp}] ${message}`];
}

export function buildSessionStateForUserStart(profile: ProfileV1, startAt: number, durationMs: number): ProfileV1['session'] {
  const isTimedMode = profile.settings.mode === 'timed';
  return {
    ...profile.session,
    typedAnswer: '',
    problemStartedAt: null,
    sessionStartAt: startAt,
    sessionEndsAt: isTimedMode ? startAt + durationMs : null,
    sessionDurationMs: durationMs,
    coins: 0,
    currentStats: { correct: 0, wrong: 0 },
    blockedProblemKeys: [],
    lastScreen: 'practice',
    algorithmLog: appendAlgorithmLog([], `session_started mode:${profile.settings.mode} examples:${profile.settings.examplesPerSession}`, startAt)
  };
}

export function buildSessionStateBeforeStart(profile: ProfileV1, durationMs: number): ProfileV1['session'] {
  return {
    ...profile.session,
    activeProblem: null,
    typedAnswer: '',
    problemStartedAt: null,
    sessionStartAt: null,
    sessionEndsAt: null,
    sessionDurationMs: durationMs,
    coins: 0,
    currentStats: { correct: 0, wrong: 0 },
    blockedProblemKeys: [],
    lastScreen: 'practice',
    algorithmLog: []
  };
}

export function buildProfileForSessionReset(currentProfile: ProfileV1, defaultProfile: ProfileV1): ProfileV1 {
  return {
    ...defaultProfile,
    settings: currentProfile.settings
  };
}

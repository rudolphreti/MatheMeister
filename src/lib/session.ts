import { Problem } from './types';
import { ProfileV1 } from './types';

interface FinalizeSessionResultsArgs {
  profileProblemStats: Record<string, ProfileV1['problemStats'][string]>;
  pendingProblemStats: Record<string, ProfileV1['problemStats'][string]>;
  leaderboard: ProfileV1['leaderboard'];
  userName: string;
  sessionCoins: number;
  sessionAttemptsCount: number;
  alreadyFinalized: boolean;
  now?: number;
}

export function moveSkippedProblemToQueueEnd(queue: string[], activeProblemKey: string): string[] {
  const matchingKeys = queue.filter((key) => key === activeProblemKey);
  if (matchingKeys.length !== 1) return queue;

  const nextQueue = queue.filter((key) => key !== activeProblemKey);
  nextQueue.push(activeProblemKey);
  return nextQueue;
}

export function buildCorrectionQueue(attempts: Array<{ key: string; correct: boolean }>): string[] {
  const seen = new Set<string>();
  const queue: string[] = [];
  attempts.forEach((attempt) => {
    if (attempt.correct) return;
    if (!attempt.key || seen.has(attempt.key)) return;
    seen.add(attempt.key);
    queue.push(attempt.key);
  });
  return queue;
}

export function getCorrectionProgress(correctionQueue: string[], solvedKeys: string[]): { solved: number; total: number; remaining: number } {
  const total = correctionQueue.length;
  const solved = Math.max(0, Math.min(total, solvedKeys.length));
  return { solved, total, remaining: Math.max(0, total - solved) };
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
    algorithmLog: appendAlgorithmLog([], `session_started mode:${profile.settings.mode} examples:${profile.settings.examplesPerSession}`, startAt),
    sessionAttempts: [],
    correctionQueue: [],
    correctionSolvedKeys: [],
    correctionModeActive: false
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
    algorithmLog: [],
    sessionAttempts: [],
    correctionQueue: [],
    correctionSolvedKeys: [],
    correctionModeActive: false
  };
}

export function buildProfileForSessionReset(currentProfile: ProfileV1, defaultProfile: ProfileV1): ProfileV1 {
  return {
    ...defaultProfile,
    settings: currentProfile.settings
  };
}

export function finalizeSessionResults(args: FinalizeSessionResultsArgs): {
  problemStats: Record<string, ProfileV1['problemStats'][string]>;
  leaderboard: ProfileV1['leaderboard'];
  finalized: boolean;
} {
  const problemStats = { ...args.profileProblemStats, ...args.pendingProblemStats };
  const hasAttempts = args.sessionAttemptsCount > 0;
  const hasUserName = args.userName.trim().length > 0;
  const shouldAppendLeaderboard = hasAttempts && hasUserName && !args.alreadyFinalized;
  const entryTime = args.now ?? Date.now();
  const nextLeaderboard = shouldAppendLeaderboard
    ? [{ userName: args.userName.trim(), coins: args.sessionCoins, completedAt: entryTime }, ...args.leaderboard]
    : args.leaderboard;
  const sortedLeaderboard = nextLeaderboard.slice().sort((a, b) => b.coins - a.coins || b.completedAt - a.completedAt);
  return {
    problemStats,
    leaderboard: sortedLeaderboard,
    finalized: args.alreadyFinalized || shouldAppendLeaderboard
  };
}

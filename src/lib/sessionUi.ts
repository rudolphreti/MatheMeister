import { Problem, SessionAttempt } from './types';

type PracticeUiStateParams = {
  sessionStarted: boolean;
  ended: boolean;
  correctionModeActive: boolean;
  correctionModeCompleted: boolean;
};

export type PracticeUiState = {
  showTimer: boolean;
  showSessionSummary: boolean;
  showAnswerArea: boolean;
  showAnswerControls: boolean;
  showMainEndedReview: boolean;
  showCorrectionFinishedNotice: boolean;
};

export type SessionReviewItem = {
  key: string;
  expression: string;
};

export function getPracticeUiState(params: PracticeUiStateParams): PracticeUiState {
  const sessionIsInteractive = params.sessionStarted && !params.ended;
  const correctionFinished = params.ended && params.correctionModeCompleted && !params.correctionModeActive;

  return {
    showTimer: !params.ended && !params.correctionModeActive,
    showSessionSummary: !correctionFinished,
    showAnswerArea: sessionIsInteractive,
    showAnswerControls: sessionIsInteractive,
    showMainEndedReview: params.ended && !params.correctionModeCompleted,
    showCorrectionFinishedNotice: correctionFinished
  };
}

export function buildSessionReview(params: {
  attempts: SessionAttempt[];
  allProblems: Problem[];
  doneExamples: number;
  sessionExamples: number;
  timedOut: boolean;
}): { mistakes: SessionReviewItem[]; unfinished: SessionReviewItem[] } {
  const seenMistakes = new Set<string>();
  const mistakes = params.attempts.reduce<SessionReviewItem[]>((items, attempt) => {
    if (attempt.correct || !attempt.key || seenMistakes.has(attempt.key)) return items;
    seenMistakes.add(attempt.key);
    items.push({ key: attempt.key, expression: attempt.expression });
    return items;
  }, []);

  if (!params.timedOut) return { mistakes, unfinished: [] };

  const attemptedKeys = new Set(params.attempts.map((attempt) => attempt.key).filter(Boolean));
  const unfinishedCount = Math.max(0, params.sessionExamples - params.doneExamples);
  const unfinished = params.allProblems
    .filter((problem) => !attemptedKeys.has(problem.key))
    .slice(0, unfinishedCount)
    .map((problem) => ({ key: problem.key, expression: problem.expression }));

  return { mistakes, unfinished };
}

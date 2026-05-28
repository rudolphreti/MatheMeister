import { describe, expect, it } from 'vitest';
import { buildSessionReview, getPracticeUiState } from '../src/lib/sessionUi';

const problems = [
  { key: '1+1', expression: '1 + 1', answer: 2 },
  { key: '2+2', expression: '2 + 2', answer: 4 },
  { key: '3+3', expression: '3 + 3', answer: 6 },
  { key: '4+4', expression: '4 + 4', answer: 8 }
];

describe('getPracticeUiState', () => {
  it('hides answer controls and timer after the main session ends', () => {
    expect(getPracticeUiState({ sessionStarted: true, ended: true, correctionModeActive: false, correctionModeCompleted: false })).toMatchObject({
      showTimer: false,
      showAnswerArea: false,
      showAnswerControls: false,
      showMainEndedReview: true,
      showCorrectionFinishedNotice: false
    });
  });

  it('hides the timer but keeps answer controls during correction mode', () => {
    expect(getPracticeUiState({ sessionStarted: true, ended: false, correctionModeActive: true, correctionModeCompleted: false })).toMatchObject({
      showTimer: false,
      showAnswerArea: true,
      showAnswerControls: true,
      showMainEndedReview: false,
      showCorrectionFinishedNotice: false
    });
  });

  it('hides correction controls and correction lists after correction is completed', () => {
    expect(getPracticeUiState({ sessionStarted: true, ended: true, correctionModeActive: false, correctionModeCompleted: true })).toMatchObject({
      showTimer: false,
      showAnswerArea: false,
      showAnswerControls: false,
      showMainEndedReview: false,
      showCorrectionFinishedNotice: true
    });
  });
});

describe('buildSessionReview', () => {
  it('separates wrong attempts from timed-out unfinished tasks', () => {
    const review = buildSessionReview({
      attempts: [
        { key: '1+1', expression: '1 + 1', answer: 2, correct: false },
        { key: '2+2', expression: '2 + 2', answer: 4, correct: true }
      ],
      allProblems: problems,
      doneExamples: 2,
      sessionExamples: 4,
      timedOut: true
    });

    expect(review.mistakes).toEqual([{ key: '1+1', expression: '1 + 1' }]);
    expect(review.unfinished).toEqual([
      { key: '3+3', expression: '3 + 3' },
      { key: '4+4', expression: '4 + 4' }
    ]);
  });

  it('does not show unfinished tasks when the session did not time out', () => {
    const review = buildSessionReview({
      attempts: [{ key: '1+1', expression: '1 + 1', answer: 2, correct: false }],
      allProblems: problems,
      doneExamples: 4,
      sessionExamples: 4,
      timedOut: false
    });

    expect(review.unfinished).toEqual([]);
  });
});

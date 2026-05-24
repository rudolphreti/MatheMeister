import { describe, it, expect } from 'vitest';
import { ensureActiveProblemIsAllowed, moveSkippedProblemToQueueEnd } from '../src/lib/session';
import { Problem } from '../src/lib/types';

const p1: Problem = { key: '1+1', expression: '1 + 1', answer: 2 };
const p2: Problem = { key: '2+2', expression: '2 + 2', answer: 4 };
const p3: Problem = { key: '3+3', expression: '3 + 3', answer: 6 };

describe('ensureActiveProblemIsAllowed', () => {
  it('returns true when there is no active problem', () => {
    expect(ensureActiveProblemIsAllowed(null, [p1, p2])).toBe(true);
  });

  it('returns true when pool is empty', () => {
    expect(ensureActiveProblemIsAllowed(p1, [])).toBe(true);
  });

  it('returns true when active problem exists in allowed pool', () => {
    expect(ensureActiveProblemIsAllowed(p1, [p1, p2])).toBe(true);
  });

  it('returns false when active problem is excluded from allowed pool', () => {
    expect(ensureActiveProblemIsAllowed(p1, [p2])).toBe(false);
  });
});

describe('moveSkippedProblemToQueueEnd', () => {
  it('moves active problem key to queue end', () => {
    expect(moveSkippedProblemToQueueEnd(['1+1', '2+2', '3+3'], '1+1')).toEqual(['2+2', '3+3', '1+1']);
  });

  it('keeps queue unchanged when active key is missing', () => {
    expect(moveSkippedProblemToQueueEnd(['1+1', '2+2'], '9+9')).toEqual(['1+1', '2+2']);
  });

  it('keeps queue unchanged when active key is duplicated', () => {
    expect(moveSkippedProblemToQueueEnd(['1+1', '2+2', '1+1'], '1+1')).toEqual(['1+1', '2+2', '1+1']);
  });
});

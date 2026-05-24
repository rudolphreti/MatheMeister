import { describe, it, expect } from 'vitest';
import { ensureActiveProblemIsAllowed } from '../src/lib/session';
import { Problem } from '../src/lib/types';

const p1: Problem = { key: '1+1', expression: '1 + 1', answer: 2 };
const p2: Problem = { key: '2+2', expression: '2 + 2', answer: 4 };

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

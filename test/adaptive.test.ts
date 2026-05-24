import { describe, it, expect } from 'vitest';
import { coinReward, pickWeightedProblem, updateProblemStat } from '../src/lib/adaptive';

describe('adaptive', () => {
  it('coins', () => {
    expect(coinReward(2000, true)).toBe(5);
    expect(coinReward(2999, true)).toBe(5);
    expect(coinReward(3000, true)).toBe(3);
    expect(coinReward(5999, true)).toBe(3);
    expect(coinReward(6000, true)).toBe(2);
    expect(coinReward(9999, true)).toBe(2);
    expect(coinReward(10000, true)).toBe(1);
    expect(coinReward(15000, true)).toBe(1);
    expect(coinReward(7000, false)).toBe(0);
  });

  it('coins handles unusual response times safely', () => {
    expect(coinReward(-100, true)).toBe(5);
    expect(coinReward(Number.NaN, true)).toBe(1);
    expect(coinReward(Number.POSITIVE_INFINITY, true)).toBe(1);
  });

  it('difficulty update', () => {
    const st = updateProblemStat(undefined, { key: '1+1', expression: '1 + 1', answer: 2 }, false, 1000, Date.now());
    expect(st.difficultyScore).toBe(5);
  });

  it('does not repeat easy custom tasks too aggressively', () => {
    const stats = {
      '2+2': { key: '2+2', expression: '2 + 2', attempts: 10, correct: 10, wrong: 0, averageResponseTimeMs: 1200, difficultyScore: 0, lastSeenAt: Date.now() },
      '8+7': { key: '8+7', expression: '8 + 7', attempts: 10, correct: 6, wrong: 4, averageResponseTimeMs: 5500, difficultyScore: 20, lastSeenAt: Date.now() }
    };

    const original = Math.random;
    Math.random = () => 0.99;
    const picked = pickWeightedProblem(
      [
        { key: '2+2', expression: '2 + 2', answer: 4 },
        { key: '8+7', expression: '8 + 7', answer: 15 }
      ],
      stats,
      undefined,
      new Set(['2+2'])
    );
    Math.random = original;

    expect(picked.key).toBe('8+7');
  });
});

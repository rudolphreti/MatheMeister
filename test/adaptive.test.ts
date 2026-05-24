import { describe, it, expect } from 'vitest';
import { coinReward, updateProblemStat } from '../src/lib/adaptive';

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
});

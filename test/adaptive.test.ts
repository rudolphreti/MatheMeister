import { describe, it, expect } from 'vitest';
import { coinReward, updateProblemStat } from '../src/lib/adaptive';

describe('adaptive', () => {
  it('coins', () => { expect(coinReward(2000,true)).toBe(5); expect(coinReward(7000,true)).toBe(2); expect(coinReward(7000,false)).toBe(0); });
  it('difficulty update', () => {
    const st = updateProblemStat(undefined, { key:'1+1', expression:'1 + 1', answer:2 }, false, 1000, Date.now());
    expect(st.difficultyScore).toBe(5);
  });
});

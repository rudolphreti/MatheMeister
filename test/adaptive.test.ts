import { describe, it, expect } from 'vitest';
import { buildEligibleProblemPool, calculateProblemWeight, coinReward, explainCoinReward, explainSelectionDecision, pickWeightedProblem, selectNextProblem, updateProblemStatsAfterAnswer, updateProblemStat } from '../src/lib/adaptive';
import { buildProblemPool } from '../src/lib/math';

const settings = { mode:'timed', sessionMinutes:10, min:0, max:10, additionEnabled:true, subtractionEnabled:true, subtractionMinuendMin:0, subtractionMinuendMax:10, terms:2, soundEnabled:true, language:'de', examplesPerSession:10, excludeResultZero:false, excludePlusMinusZero:false, excludePlusMinusOne:false, customTasksText:'' } as const;

describe('adaptive', () => {
  it('coins', () => {
    expect(coinReward(2000, true)).toBe(5);
    expect(coinReward(3000, true)).toBe(3);
    expect(coinReward(6000, true)).toBe(2);
    expect(coinReward(10000, true)).toBe(1);
  });
  it('error debt increments and decrements only on correct', () => {
    const p = { key: '8+7', expression: '8 + 7', answer: 15 };
    const a = updateProblemStatsAfterAnswer(undefined, p, false, 1000, Date.now());
    const b = updateProblemStatsAfterAnswer(a, p, false, 1000, Date.now());
    const c = updateProblemStatsAfterAnswer(b, p, true, 1000, Date.now());
    expect(a.errorDebt).toBe(1); expect(b.errorDebt).toBe(2); expect(c.errorDebt).toBe(1);
  });
  it('caps response times for averages and slow weights', () => {
    const p = { key: '1+1', expression: '1 + 1', answer: 2 };
    const st = updateProblemStatsAfterAnswer(undefined, p, true, 999999, Date.now());
    expect(st.averageResponseTimeMs).toBe(30000);
    expect(calculateProblemWeight(p, { [p.key]: st }, 'slowSolved')).toBe(21);
  });
  it('priority: errorDebt over never seen', () => {
    const pool = [{ key: '1+1', expression: '1 + 1', answer: 2 }, { key: '2+2', expression: '2 + 2', answer: 4 }];
    const picked = selectNextProblem(pool, { '2+2': { key:'2+2', expression:'2 + 2', attempts:3, correct:1, wrong:2, averageResponseTimeMs:7000, difficultyScore:10, errorDebt:2, lastSeenAt:null, lastSeenTurn:null, excluded:false } }, { turnNumber:1, consecutiveErrorDebtSelections:0 });
    expect(picked.key).toBe('2+2');
  });
  it('anti repetition avoids previous key when alternatives exist', () => {
    const pool = [{ key: '1+1', expression: '1 + 1', answer: 2 }, { key: '2+2', expression: '2 + 2', answer: 4 }];
    const picked = pickWeightedProblem(pool, {}, '1+1');
    expect(picked.key).toBe('2+2');
  });
  it('eligible pool excludes flagged stats', () => {
    const pool = buildEligibleProblemPool(settings, { '1+1': { key:'1+1', expression:'1 + 1', attempts:1, correct:1, wrong:0, averageResponseTimeMs:1000, difficultyScore:0, errorDebt:0, lastSeenAt:null, lastSeenTurn:null, excluded:true } });
    expect(pool.some((p) => p.key === '1+1')).toBe(false);
  });
  it('difficulty update', () => {
    const st = updateProblemStat(undefined, { key: '1+1', expression: '1 + 1', answer: 2 }, false, 1000, Date.now());
    expect(st.difficultyScore).toBe(5);
  });

  it('explains coin reward thresholds and correctness', () => {
    expect(explainCoinReward(2500, true)).toContain('fast');
    expect(explainCoinReward(2500, true)).toContain('5');
    expect(explainCoinReward(7500, true)).toContain('slow');
    expect(explainCoinReward(1000, false)).toContain('incorrect');
  });

  it('explains selection logic with chosen group and exclusions', () => {
    const pool = [{ key: '1+1', expression: '1 + 1', answer: 2 }, { key: '2+2', expression: '2 + 2', answer: 4 }];
    const explanation = explainSelectionDecision(
      pool,
      { '2+2': { key:'2+2', expression:'2 + 2', attempts:3, correct:1, wrong:2, averageResponseTimeMs:7000, difficultyScore:10, errorDebt:2, lastSeenAt:null, lastSeenTurn:null, excluded:false } },
      { previousProblemKey: '1+1', turnNumber: 3, consecutiveErrorDebtSelections: 0 }
    );

    expect(explanation).toContain('selectedGroup:errorDebt');
    expect(explanation).toContain('excluded_previous:-');
    expect(explanation).toContain('selected:2+2');
    expect(explanation).toContain('weights:[');
    expect(explanation).toContain('groupReasons:');
  });
});

import { describe, it, expect } from 'vitest';
import { buildProblemPool, parseCustomProblems } from '../src/lib/math';

describe('math pool', () => {
  it('keeps results in range and no negatives', () => {
    const pool = buildProblemPool({ mode:'timed', sessionMinutes:10, min:0, max:20, additionEnabled:true, subtractionEnabled:true, terms:2, soundEnabled:true, language:'de', examplesPerSession:10, excludeResultZero:false, excludePlusMinusZero:false, excludePlusMinusOne:false, customTasksText:"" });
    expect(pool.length).toBeGreaterThan(0);
    for (const p of pool) expect(p.answer).toBeGreaterThanOrEqual(0);
  });

  it('excludes 1 - x and 0 + x when one/zero exclusions are enabled', () => {
    const pool = buildProblemPool({ mode:'timed', sessionMinutes:10, min:0, max:5, additionEnabled:true, subtractionEnabled:true, terms:2, soundEnabled:true, language:'de', examplesPerSession:10, excludeResultZero:false, excludePlusMinusZero:true, excludePlusMinusOne:true, customTasksText:'' });
    expect(pool.some((p) => p.expression.startsWith('1 - '))).toBe(false);
    expect(pool.some((p) => p.expression.startsWith('0 + '))).toBe(false);
  });

  it('parses custom one-line tasks', () => {
    const settings = { mode:'timed', sessionMinutes:10, min:0, max:20, additionEnabled:true, subtractionEnabled:true, terms:2, soundEnabled:true, language:'de', examplesPerSession:10, excludeResultZero:false, excludePlusMinusZero:false, excludePlusMinusOne:false, customTasksText:'12+3\n17-14\nfoo\n3+7' } as const;
    const pool = parseCustomProblems(settings);
    expect(pool.map((p) => p.key)).toEqual(['12+3', '17-14', '3+7']);
  });
});

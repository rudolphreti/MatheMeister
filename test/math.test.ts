import { describe, it, expect } from 'vitest';
import { buildProblemPool, parseCustomProblems } from '../src/lib/math';
import { Settings, SubtractionDidacticGroup } from '../src/lib/types';

const allSubtractionGroups: SubtractionDidacticGroup[] = [
  'minuendGreaterThanTenSubtrahendLessThanTenResultLessThanTen',
  'minuendGreaterThanTenSubtrahendLessThanTenResultGreaterThanTen',
  'bothTermsAtLeastTen',
  'bothTermsAtMostTen'
];

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  mode: 'timed',
  sessionMinutes: 10,
  min: 0,
  additionMaxResult: 20,
  additionEnabled: true,
  subtractionEnabled: true,
  subtractionDidacticGroups: allSubtractionGroups,
  terms: 2,
  soundEnabled: true,
  language: 'de',
  examplesPerSession: 10,
  excludeResultZero: false,
  excludePlusMinusZero: false,
  excludePlusMinusOne: false,
  customTasksText: '',
  ...overrides
});

const parseSubtraction = (expression: string) => {
  const [minuend, subtrahend] = expression.split(' - ').map(Number);
  return { minuend, subtrahend, result: minuend - subtrahend };
};

describe('math pool', () => {
  it('keeps results non-negative without relying on a global maximum setting', () => {
    const pool = buildProblemPool(settings());
    expect(pool.length).toBeGreaterThan(0);
    for (const p of pool) expect(p.answer).toBeGreaterThanOrEqual(0);
  });

  it('limits addition by configured maximum result only', () => {
    const pool = buildProblemPool(settings({ additionEnabled: true, subtractionEnabled: false, additionMaxResult: 10 }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => p.expression.includes('+'))).toBe(true);
    expect(pool.every((p) => p.answer <= 10)).toBe(true);
    expect(pool.some((p) => p.expression === '10 + 0')).toBe(true);
    expect(pool.some((p) => p.expression === '10 + 1')).toBe(false);
  });

  it('does not use addition maximum result to limit subtraction operands', () => {
    const pool = buildProblemPool(settings({ additionEnabled: false, subtractionEnabled: true, additionMaxResult: 5, subtractionDidacticGroups: ['bothTermsAtLeastTen'] }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => p.expression.includes('-'))).toBe(true);
    expect(pool.every((p) => parseSubtraction(p.expression).minuend >= 10)).toBe(true);
    expect(pool.every((p) => parseSubtraction(p.expression).subtrahend >= 10)).toBe(true);
    expect(pool.some((p) => parseSubtraction(p.expression).minuend > 5 || parseSubtraction(p.expression).subtrahend > 5)).toBe(true);
  });

  it('allows only subtraction tasks with minuend > 10, subtrahend < 10 and result < 10 when that didactic group is selected', () => {
    const pool = buildProblemPool(settings({ additionEnabled: false, subtractionEnabled: true, subtractionDidacticGroups: ['minuendGreaterThanTenSubtrahendLessThanTenResultLessThanTen'] }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => {
      const task = parseSubtraction(p.expression);
      return task.minuend > 10 && task.subtrahend < 10 && task.result < 10 && task.result >= 0;
    })).toBe(true);
    expect(pool.some((p) => p.expression === '11 - 2')).toBe(true);
    expect(pool.some((p) => p.expression === '12 - 1')).toBe(false);
  });

  it('allows only subtraction tasks with minuend > 10, subtrahend < 10 and result > 10 when that didactic group is selected', () => {
    const pool = buildProblemPool(settings({ additionEnabled: false, subtractionEnabled: true, subtractionDidacticGroups: ['minuendGreaterThanTenSubtrahendLessThanTenResultGreaterThanTen'] }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => {
      const task = parseSubtraction(p.expression);
      return task.minuend > 10 && task.subtrahend < 10 && task.result > 10;
    })).toBe(true);
    expect(pool.some((p) => p.expression === '12 - 1')).toBe(true);
    expect(pool.some((p) => p.expression === '11 - 1')).toBe(false);
  });

  it('allows only subtraction tasks where both terms are at least ten when that didactic group is selected', () => {
    const pool = buildProblemPool(settings({ additionEnabled: false, subtractionEnabled: true, subtractionDidacticGroups: ['bothTermsAtLeastTen'] }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => {
      const task = parseSubtraction(p.expression);
      return task.minuend >= 10 && task.subtrahend >= 10 && task.result >= 0;
    })).toBe(true);
    expect(pool.some((p) => p.expression === '20 - 10')).toBe(true);
    expect(pool.some((p) => p.expression === '20 - 9')).toBe(false);
  });

  it('allows only subtraction tasks where both terms are at most ten when that didactic group is selected', () => {
    const pool = buildProblemPool(settings({ additionEnabled: false, subtractionEnabled: true, subtractionDidacticGroups: ['bothTermsAtMostTen'] }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => {
      const task = parseSubtraction(p.expression);
      return task.minuend <= 10 && task.subtrahend <= 10 && task.result >= 0;
    })).toBe(true);
    expect(pool.some((p) => p.expression === '10 - 9')).toBe(true);
    expect(pool.some((p) => p.expression === '11 - 1')).toBe(false);
  });

  it('returns no subtraction tasks when no didactic subtraction groups are selected', () => {
    const pool = buildProblemPool(settings({ additionEnabled: false, subtractionEnabled: true, subtractionDidacticGroups: [] }));
    expect(pool).toEqual([]);
  });

  it('excludes 1 - x and 0 + x when one/zero exclusions are enabled', () => {
    const pool = buildProblemPool(settings({ additionMaxResult: 5, excludePlusMinusZero: true, excludePlusMinusOne: true }));
    expect(pool.some((p) => p.expression.startsWith('1 - '))).toBe(false);
    expect(pool.some((p) => p.expression.startsWith('0 + '))).toBe(false);
  });

  it('excludes +1 tasks like 1 + x and x + 1 when one exclusion is enabled', () => {
    const pool = buildProblemPool(settings({ additionMaxResult: 5, excludePlusMinusOne: true }));
    expect(pool.some((p) => p.expression.startsWith('1 + '))).toBe(false);
    expect(pool.some((p) => p.expression.endsWith(' + 1'))).toBe(false);
  });

  it('parses custom tasks through addition result limit and selected subtraction didactic groups', () => {
    const pool = parseCustomProblems(settings({
      additionMaxResult: 10,
      subtractionDidacticGroups: ['minuendGreaterThanTenSubtrahendLessThanTenResultLessThanTen'],
      customTasksText: '12+3\n4+6\n17-8\n12-1\nfoo\n3+7'
    }));
    expect(pool.map((p) => p.key)).toEqual(['4+6', '17-8', '3+7']);
  });
});

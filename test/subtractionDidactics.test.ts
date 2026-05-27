import { describe, expect, it } from 'vitest';
import { buildCrossingSteps, isBridgeToTenSubtractionType, parseSimpleSubtraction, toRows } from '../src/lib/subtractionDidactics';

describe('subtraction didactics', () => {
  it('detects bridge-to-ten subtraction type', () => {
    const parsed = parseSimpleSubtraction('17 - 9');
    expect(parsed).not.toBeNull();
    expect(isBridgeToTenSubtractionType(parsed!)).toBe(true);
  });

  it('rejects non-matching type', () => {
    expect(isBridgeToTenSubtractionType({ minuend: 10, subtrahend: 9, result: 1 })).toBe(false);
    expect(isBridgeToTenSubtractionType({ minuend: 17, subtrahend: 10, result: 7 })).toBe(false);
    expect(isBridgeToTenSubtractionType({ minuend: 17, subtrahend: 7, result: 10 })).toBe(false);
  });

  it('builds crossing steps for 17 - 9 as 2 then 7', () => {
    expect(buildCrossingSteps(17, 9)).toEqual([
      { blueCrossed: 2, redCrossed: 2 },
      { blueCrossed: 7, redCrossed: 7 }
    ]);
  });

  it('splits rows by 10', () => {
    expect(toRows(17)).toEqual([10, 7]);
    expect(toRows(9)).toEqual([9]);
    expect(toRows(20)).toEqual([10, 10]);
  });
});

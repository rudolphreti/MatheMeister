import { describe, expect, it } from 'vitest';
import { applyVisualizationBallCross, buildCrossingSteps, buildRowCrossCountsFromRight, buildVisualizationStepView, isBridgeToTenSubtractionType, isVisualizationStepComplete, parseSimpleSubtraction, toRows } from '../src/lib/subtractionDidactics';

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

  it('builds crossing steps by first reducing blue to 10, then crossing remaining red', () => {
    expect(buildCrossingSteps(14, 9)).toEqual([
      { blueCrossed: 4, redCrossed: 4 },
      { blueCrossed: 5, redCrossed: 5 }
    ]);
    expect(buildCrossingSteps(17, 9)).toEqual([
      { blueCrossed: 7, redCrossed: 7 },
      { blueCrossed: 2, redCrossed: 2 }
    ]);
  });

  it('splits rows by 10', () => {
    expect(toRows(17)).toEqual([10, 7]);
    expect(toRows(9)).toEqual([9]);
    expect(toRows(20)).toEqual([10, 10]);
  });

  it('distributes crossed balls from right to left by rows', () => {
    expect(buildRowCrossCountsFromRight([10, 7], 2)).toEqual([0, 2]);
    expect(buildRowCrossCountsFromRight([10, 7], 7)).toEqual([0, 7]);
    expect(buildRowCrossCountsFromRight([10, 7], 9)).toEqual([2, 7]);
    expect(buildRowCrossCountsFromRight([9], 7)).toEqual([7]);
  });

  it('allows interactive crossing only from right to left up to the current step target', () => {
    const stepTarget = buildVisualizationStepView(17, 9, 1);
    const emptyState = { blueCrossed: 0, redCrossed: 0 };

    expect(applyVisualizationBallCross(emptyState, stepTarget, 'blue', 1)).toEqual(emptyState);
    expect(applyVisualizationBallCross(emptyState, stepTarget, 'blue', 0)).toEqual({ blueCrossed: 1, redCrossed: 0 });

    const fullBlue = { blueCrossed: 7, redCrossed: 0 };
    expect(applyVisualizationBallCross(fullBlue, stepTarget, 'blue', 7)).toEqual(fullBlue);
  });

  it('marks visualization step complete only when the user crossed the expected amounts', () => {
    const stepTarget = buildVisualizationStepView(17, 9, 1);

    expect(isVisualizationStepComplete({ blueCrossed: 7, redCrossed: 6 }, stepTarget)).toBe(false);
    expect(isVisualizationStepComplete({ blueCrossed: 7, redCrossed: 7 }, stepTarget)).toBe(true);
  });

  it('builds step-3 view with 10 blue visible and all red crossed', () => {
    expect(buildVisualizationStepView(11, 8, 2)).toEqual({
      blueVisible: 10,
      redVisible: 7,
      blueCrossed: 7,
      redCrossed: 7
    });
    expect(buildVisualizationStepView(14, 9, 2)).toEqual({
      blueVisible: 10,
      redVisible: 5,
      blueCrossed: 5,
      redCrossed: 5
    });
  });
});

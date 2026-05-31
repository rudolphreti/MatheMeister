export interface ParsedSubtraction {
  minuend: number;
  subtrahend: number;
  result: number;
}

export function parseSimpleSubtraction(expression: string): ParsedSubtraction | null {
  const match = expression.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!match) return null;
  const minuend = Number(match[1]);
  const subtrahend = Number(match[2]);
  if (!Number.isFinite(minuend) || !Number.isFinite(subtrahend)) return null;
  return { minuend, subtrahend, result: minuend - subtrahend };
}

export function isBridgeToTenSubtractionType(value: ParsedSubtraction): boolean {
  return value.minuend > 10 && value.subtrahend < 10 && value.result < 10 && value.result >= 0;
}

export interface CrossingStep {
  blueCrossed: number;
  redCrossed: number;
}

export interface VisualizationStepView {
  blueVisible: number;
  redVisible: number;
  blueCrossed: number;
  redCrossed: number;
}

export type VisualizationBallColor = 'blue' | 'red';

export interface VisualizationCrossState {
  blueCrossedPositions: number[];
  redCrossedPositions: number[];
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value >= 0))).sort((a, b) => a - b);
}

function expectedPositions(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index);
}

function samePositions(actual: number[], expected: number[]): boolean {
  const normalized = uniqueSorted(actual);
  if (normalized.length !== expected.length) return false;
  return normalized.every((value, index) => value === expected[index]);
}

export function isVisualizationStepValid(
  state: VisualizationCrossState,
  target: VisualizationStepView
): boolean {
  return samePositions(state.blueCrossedPositions, expectedPositions(target.blueCrossed))
    && samePositions(state.redCrossedPositions, expectedPositions(target.redCrossed));
}

export function toggleVisualizationBallCross(
  state: VisualizationCrossState,
  color: VisualizationBallColor,
  positionFromRight: number
): VisualizationCrossState {
  const key = color === 'blue' ? 'blueCrossedPositions' : 'redCrossedPositions';
  const current = state[key];
  const exists = current.includes(positionFromRight);
  const nextPositions = exists
    ? current.filter((position) => position !== positionFromRight)
    : uniqueSorted([...current, positionFromRight]);

  return { ...state, [key]: nextPositions };
}

export function buildCrossingSteps(minuend: number, subtrahend: number): CrossingStep[] {
  const steps: CrossingStep[] = [];
  const toTen = Math.max(0, minuend - 10);
  const firstCross = Math.min(toTen, subtrahend);
  if (firstCross > 0) steps.push({ blueCrossed: firstCross, redCrossed: firstCross });
  const remaining = subtrahend - firstCross;
  if (remaining > 0) steps.push({ blueCrossed: remaining, redCrossed: remaining });
  return steps;
}

export function toRows(count: number): number[] {
  const rows: number[] = [];
  let left = count;
  while (left > 0) {
    const row = Math.min(10, left);
    rows.push(row);
    left -= row;
  }
  return rows;
}

export function buildRowCrossCountsFromRight(rows: number[], crossedTotal: number): number[] {
  const result = rows.map(() => 0);
  let left = Math.max(0, crossedTotal);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (left <= 0) break;
    const crossedInRow = Math.min(rows[i], left);
    result[i] = crossedInRow;
    left -= crossedInRow;
  }
  return result;
}

export function buildVisualizationStepView(
  minuend: number,
  subtrahend: number,
  stepIndex: number
): VisualizationStepView {
  const crossingSteps = buildCrossingSteps(minuend, subtrahend);
  if (stepIndex <= 0) return { blueVisible: minuend, redVisible: subtrahend, blueCrossed: 0, redCrossed: 0 };
  if (stepIndex === 1) {
    const first = crossingSteps[0] ?? { blueCrossed: 0, redCrossed: 0 };
    return { blueVisible: minuend, redVisible: subtrahend, blueCrossed: first.blueCrossed, redCrossed: first.redCrossed };
  }
  const first = crossingSteps[0] ?? { blueCrossed: 0, redCrossed: 0 };
  const second = crossingSteps[1] ?? { blueCrossed: 0, redCrossed: 0 };
  return {
    blueVisible: 10,
    redVisible: subtrahend - first.redCrossed,
    blueCrossed: second.blueCrossed,
    redCrossed: subtrahend - first.redCrossed
  };
}

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

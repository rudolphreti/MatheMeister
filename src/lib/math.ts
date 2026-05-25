import { Problem, Settings, Operator } from './types';

const rand = (n: number) => Math.floor(Math.random() * n);

function evalOps(nums: number[], ops: Operator[]): number {
  let acc = nums[0];
  for (let i = 0; i < ops.length; i++) {
    acc = ops[i] === '+' ? acc + nums[i + 1] : acc - nums[i + 1];
  }
  return acc;
}


function shouldExcludeProblem(settings: Settings, nums: number[], opsArr: Operator[], answer: number): boolean {
  if (settings.excludeResultZero && answer === 0) return true;
  if (settings.excludePlusMinusZero || settings.excludePlusMinusOne) {
    for (let i = 0; i < opsArr.length; i++) {
      const prev = nums[i];
      const next = nums[i + 1];
      if (settings.excludePlusMinusZero && next === 0) return true;
      if (settings.excludePlusMinusOne && next === 1) return true;
      if (settings.excludePlusMinusZero && opsArr[i] === '+' && prev === 0) return true;
      if (settings.excludePlusMinusOne && opsArr[i] === '+' && prev === 1) return true;
      if (settings.excludePlusMinusOne && opsArr[i] === '-' && prev === 1) return true;
    }
  }
  return false;
}

export function generateProblem(settings: Settings): Problem {
  const pool = buildProblemPool(settings);
  if (pool.length === 0) {
    return { key: '0+0', expression: '0 + 0', answer: 0 };
  }
  return pool[rand(pool.length)];
}

function parseCustomProblemLine(line: string): Problem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s*([+-])\s*(\d+)$/);
  if (!match) return null;
  const left = Number(match[1]);
  const op = match[2] as Operator;
  const right = Number(match[3]);
  const answer = op === '+' ? left + right : left - right;
  const expression = `${left} ${op} ${right}`;
  return { key: expression.replace(/ /g, ''), expression, answer };
}

export function parseCustomProblems(settings: Settings): Problem[] {
  const lines = settings.customTasksText.split('\n');
  const parsed: Problem[] = [];
  for (const line of lines) {
    const problem = parseCustomProblemLine(line);
    if (!problem) continue;
    if (problem.expression.includes('+') && !settings.additionEnabled) continue;
    if (problem.expression.includes('-') && !settings.subtractionEnabled) continue;
    const nums = problem.expression.split(' ').filter((part) => /^\d+$/.test(part)).map(Number);
    if (nums.some((n) => n < settings.min || n > settings.max)) continue;
    if (problem.answer < settings.min || problem.answer > settings.max) continue;
    if (shouldExcludeProblem(settings, nums, [problem.expression.includes('+') ? '+' : '-'], problem.answer)) continue;
    parsed.push(problem);
  }
  return Array.from(new Map(parsed.map((p) => [p.key, p])).values());
}

export function buildProblemPool(settings: Settings): Problem[] {
  const ops: Operator[] = [];
  if (settings.additionEnabled) ops.push('+');
  if (settings.subtractionEnabled) ops.push('-');
  if (ops.length === 0) return [];

  const min = settings.min;
  const max = settings.max;
  const subtractionMinuendMin = Math.max(min, Math.min(max, Math.floor(settings.subtractionMinuendMin)));
  const subtractionMinuendMax = Math.max(subtractionMinuendMin, Math.min(max, Math.floor(settings.subtractionMinuendMax)));
  const terms = settings.terms;
  const problems: Problem[] = [];

  const nums = new Array<number>(terms).fill(min);

  function backtrack(idx: number) {
    if (idx === terms) {
      const opCount = terms - 1;
      const opsArr = new Array<Operator>(opCount).fill('+');
      function genOps(i: number) {
        if (i === opCount) {
          let acc = nums[0];
          if (acc < min || acc > max) return;
          for (let j = 0; j < opCount; j++) {
            if (opsArr[j] === '-' && (acc < subtractionMinuendMin || acc > subtractionMinuendMax)) return;
            acc = opsArr[j] === '+' ? acc + nums[j + 1] : acc - nums[j + 1];
            if (acc < min || acc > max) return;
          }
          const answer = evalOps(nums, opsArr);
          if (shouldExcludeProblem(settings, nums, opsArr, answer)) return;
          const expr = nums.map((n, i2) => (i2 === 0 ? `${n}` : `${opsArr[i2 - 1]} ${n}`)).join(' ');
          problems.push({ key: expr.replace(/ /g, ''), expression: expr, answer });
          return;
        }
        for (const op of ops) {
          opsArr[i] = op;
          genOps(i + 1);
        }
      }
      genOps(0);
      return;
    }
    for (let n = min; n <= max; n++) {
      nums[idx] = n;
      backtrack(idx + 1);
    }
  }

  if (terms <= 3) backtrack(0);
  else {
    for (let i = 0; i < 500; i++) {
      for (let j = 0; j < terms; j++) nums[j] = min + rand(max - min + 1);
      const opCount = terms - 1;
      const opsArr = new Array<Operator>(opCount).fill('+').map(() => ops[rand(ops.length)]);
      let acc = nums[0];
      let ok = acc >= min && acc <= max;
      for (let j = 0; j < opCount && ok; j++) {
        if (opsArr[j] === '-' && (acc < subtractionMinuendMin || acc > subtractionMinuendMax)) {
          ok = false;
          break;
        }
        acc = opsArr[j] === '+' ? acc + nums[j + 1] : acc - nums[j + 1];
        ok = acc >= min && acc <= max;
      }
      if (ok) {
        const answer = evalOps(nums, opsArr);
        if (shouldExcludeProblem(settings, nums, opsArr, answer)) continue;
        const expr = nums.map((n, i2) => (i2 === 0 ? `${n}` : `${opsArr[i2 - 1]} ${n}`)).join(' ');
        problems.push({ key: expr.replace(/ /g, ''), expression: expr, answer });
      }
    }
  }

  if (problems.length === 0 && terms !== 2) {
    return buildProblemPool({ ...settings, terms: 2 });
  }
  return Array.from(new Map(problems.map((p) => [p.key, p])).values());
}

import type { AngleMode } from '@calculo/shared';
import { CONSTANTS } from '@calculo/shared';

function toRad(value: number, mode: AngleMode): number {
  switch (mode) {
    case 'deg': return value * CONSTANTS.DEG_TO_RAD;
    case 'grad': return value * CONSTANTS.GRAD_TO_RAD;
    default: return value;
  }
}

function fromRad(value: number, mode: AngleMode): number {
  switch (mode) {
    case 'deg': return value * CONSTANTS.RAD_TO_DEG;
    case 'grad': return value * CONSTANTS.RAD_TO_GRAD;
    default: return value;
  }
}

export const builtInFunctions: Record<string, (args: number[], mode: AngleMode) => number> = {
  sin: ([x], mode) => Math.sin(toRad(x, mode)),
  cos: ([x], mode) => Math.cos(toRad(x, mode)),
  tan: ([x], mode) => Math.tan(toRad(x, mode)),
  asin: ([x], _mode) => Math.asin(x),
  acos: ([x], _mode) => Math.acos(x),
  atan: ([x], _mode) => Math.atan(x),
  atan2: ([y, x], _mode) => Math.atan2(y, x),
  arcsin: ([x], _mode) => Math.asin(x),
  arccos: ([x], _mode) => Math.acos(x),
  arctan: ([x], _mode) => Math.atan(x),

  sinh: ([x]) => Math.sinh(x),
  cosh: ([x]) => Math.cosh(x),
  tanh: ([x]) => Math.tanh(x),
  asinh: ([x]) => Math.asinh(x),
  acosh: ([x]) => Math.acosh(x),
  atanh: ([x]) => Math.atanh(x),

  sec: ([x], mode) => 1 / Math.cos(toRad(x, mode)),
  csc: ([x], mode) => 1 / Math.sin(toRad(x, mode)),
  cot: ([x], mode) => 1 / Math.tan(toRad(x, mode)),

  log: ([x]) => Math.log10(x),
  ln: ([x]) => Math.log(x),
  lg: ([x]) => Math.log2(x),
  log2: ([x]) => Math.log2(x),
  log10: ([x]) => Math.log10(x),
  log: ([x, base]) => base ? Math.log(x) / Math.log(base) : Math.log10(x),

  sqrt: ([x]) => Math.sqrt(x),
  cbrt: ([x]) => Math.cbrt(x),
  abs: ([x]) => Math.abs(x),
  floor: ([x]) => Math.floor(x),
  ceil: ([x]) => Math.ceil(x),
  round: ([x]) => Math.round(x),
  trunc: ([x]) => Math.trunc(x),
  sign: ([x]) => Math.sign(x),
  exp: ([x]) => Math.exp(x),

  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),

  mod: ([a, b]) => ((a % b) + b) % b,
  gcd: ([a, b]) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
  },
  lcm: ([a, b]) => Math.abs(a * b) / builtInFunctions.gcd([a, b], 'rad'),

  rand: () => Math.random(),
  randint: ([min, max]) => Math.floor(Math.random() * (max - min + 1)) + min,

  degrees: ([x]) => fromRad(x, 'deg'),
  radians: ([x]) => toRad(x, 'deg'),
  gradient: ([x]) => fromRad(x, 'grad'),

  factorial: ([n]) => {
    if (n < 0) throw new Error('Factorial of negative number');
    if (n === 0 || n === 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },

  perm: ([n, k]) => {
    let r = 1;
    for (let i = n; i > n - k; i--) r *= i;
    return r;
  },
  comb: ([n, k]) => {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++) {
      r *= (n - k + i) / i;
    }
    return Math.round(r);
  },

  hypot: ([a, b]) => Math.hypot(a, b),
  clamp: ([x, min, max]) => Math.min(Math.max(x, min), max),
  lerp: ([a, b, t]) => a + (b - a) * t,

  sum: (args) => args.reduce((a, b) => a + b, 0),
  avg: (args) => args.reduce((a, b) => a + b, 0) / args.length,
  mean: (args) => args.reduce((a, b) => a + b, 0) / args.length,
  median: (args) => {
    const sorted = [...args].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  },
  std: (args) => {
    const m = builtInFunctions.mean(args, 'rad');
    return Math.sqrt(args.reduce((s, x) => s + (x - m) ** 2, 0) / args.length);
  },
  variance: (args) => {
    const m = builtInFunctions.mean(args, 'rad');
    return args.reduce((s, x) => s + (x - m) ** 2, 0) / args.length;
  },

  pow: ([x, y]) => Math.pow(x, y),
  root: ([x, y]) => Math.pow(x, 1 / y),
};

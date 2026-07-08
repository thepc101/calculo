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

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function factorial(n: number): number {
  if (n < 0) throw new Error('Factorial of negative number');
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function perm(n: number, k: number): number {
  let r = 1;
  for (let i = n; i > n - k; i--) r *= i;
  return r;
}

function comb(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let k2 = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k2; i++) {
    r *= (n - k2 + i) / i;
  }
  return Math.round(r);
}

type CalcFn = (args: number[], mode: AngleMode) => number;

export const builtInFunctions: Record<string, CalcFn> = {
  sin: (args, mode) => Math.sin(toRad(args[0]!, mode)),
  cos: (args, mode) => Math.cos(toRad(args[0]!, mode)),
  tan: (args, mode) => Math.tan(toRad(args[0]!, mode)),
  asin: (args) => Math.asin(args[0]!),
  acos: (args) => Math.acos(args[0]!),
  atan: (args) => Math.atan(args[0]!),
  atan2: (args) => Math.atan2(args[0]!, args[1]!),
  arcsin: (args) => Math.asin(args[0]!),
  arccos: (args) => Math.acos(args[0]!),
  arctan: (args) => Math.atan(args[0]!),
  sinh: (args) => Math.sinh(args[0]!),
  cosh: (args) => Math.cosh(args[0]!),
  tanh: (args) => Math.tanh(args[0]!),
  asinh: (args) => Math.asinh(args[0]!),
  acosh: (args) => Math.acosh(args[0]!),
  atanh: (args) => Math.atanh(args[0]!),
  sec: (args, mode) => 1 / Math.cos(toRad(args[0]!, mode)),
  csc: (args, mode) => 1 / Math.sin(toRad(args[0]!, mode)),
  cot: (args, mode) => 1 / Math.tan(toRad(args[0]!, mode)),
  log: (args) => Math.log10(args[0]!),
  ln: (args) => Math.log(args[0]!),
  lg: (args) => Math.log2(args[0]!),
  log2: (args) => Math.log2(args[0]!),
  log10: (args) => Math.log10(args[0]!),
  sqrt: (args) => Math.sqrt(args[0]!),
  cbrt: (args) => Math.cbrt(args[0]!),
  abs: (args) => Math.abs(args[0]!),
  floor: (args) => Math.floor(args[0]!),
  ceil: (args) => Math.ceil(args[0]!),
  round: (args) => Math.round(args[0]!),
  trunc: (args) => Math.trunc(args[0]!),
  sign: (args) => Math.sign(args[0]!),
  exp: (args) => Math.exp(args[0]!),
  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),
  mod: (args) => ((args[0]! % args[1]!) + args[1]!) % args[1]!,
  gcd: (args) => gcd(args[0]!, args[1]!),
  lcm: (args) => lcm(args[0]!, args[1]!),
  rand: () => Math.random(),
  randint: (args) => Math.floor(Math.random() * (args[1]! - args[0]! + 1)) + args[0]!,
  degrees: (args) => fromRad(args[0]!, 'deg'),
  radians: (args) => toRad(args[0]!, 'deg'),
  gradient: (args) => fromRad(args[0]!, 'grad'),
  factorial: (args) => factorial(args[0]!),
  perm: (args) => perm(args[0]!, args[1]!),
  comb: (args) => comb(args[0]!, args[1]!),
  hypot: (args) => Math.hypot(args[0]!, args[1]!),
  clamp: (args) => Math.min(Math.max(args[0]!, args[1]!), args[2]!),
  lerp: (args) => args[0]! + (args[1]! - args[0]!) * args[2]!,
  sum: (args) => args.reduce((a, b) => a + b, 0),
  avg: (args) => args.reduce((a, b) => a + b, 0) / args.length,
  mean: (args) => args.reduce((a, b) => a + b, 0) / args.length,
  median: (args) => {
    const sorted = [...args].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  },
  std: (args) => {
    const m = args.reduce((a, b) => a + b, 0) / args.length;
    return Math.sqrt(args.reduce((s, x) => s + (x - m) ** 2, 0) / args.length);
  },
  variance: (args) => {
    const m = args.reduce((a, b) => a + b, 0) / args.length;
    return args.reduce((s, x) => s + (x - m) ** 2, 0) / args.length;
  },
  pow: (args) => Math.pow(args[0]!, args[1]!),
  root: (args) => Math.pow(args[0]!, 1 / args[1]!),
};

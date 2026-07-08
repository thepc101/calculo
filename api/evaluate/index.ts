import type { IncomingMessage, ServerResponse } from 'http';
import { jsonResponse, readBody, getHeader } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { authenticateApiKey } from '../_lib/auth';
import { db } from '../_lib/db';
import { usageEvents } from '../_lib/schema';

// ── Math Expression Evaluator ────────────────────────────────

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/[0-9.]/.test(expr[i])) {
      let num = '';
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) {
        num += expr[i]; i++;
        if (expr[i] === '-' && /[eE]/.test(expr[i - 1])) { num += expr[i]; i++; }
      }
      tokens.push(num);
    } else if (/[a-zA-Z_]/.test(expr[i])) {
      let name = '';
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) { name += expr[i]; i++; }
      tokens.push(name);
    } else if ('+-*/^(),%'.includes(expr[i])) {
      tokens.push(expr[i]); i++;
    } else {
      throw new Error(`Unexpected character: ${expr[i]}`);
    }
  }
  return tokens;
}

function parseExpr(tokens: string[], pos: { i: number }): number {
  let left = parseMulDiv(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '+' || tokens[pos.i] === '-')) {
    const op = tokens[pos.i++];
    const right = parseMulDiv(tokens, pos);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function parseMulDiv(tokens: string[], pos: { i: number }): number {
  let left = parsePow(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '*' || tokens[pos.i] === '/' || tokens[pos.i] === '%')) {
    const op = tokens[pos.i++];
    const right = parsePow(tokens, pos);
    if (op === '*') left *= right;
    else if (op === '/') left /= right;
    else left %= right;
  }
  return left;
}

function parsePow(tokens: string[], pos: { i: number }): number {
  let left = parseUnary(tokens, pos);
  if (pos.i < tokens.length && tokens[pos.i] === '^') {
    pos.i++;
    const right = parsePow(tokens, pos);
    left = Math.pow(left, right);
  }
  return left;
}

function parseUnary(tokens: string[], pos: { i: number }): number {
  if (pos.i < tokens.length && tokens[pos.i] === '-') { pos.i++; return -parseUnary(tokens, pos); }
  if (pos.i < tokens.length && tokens[pos.i] === '+') { pos.i++; return parseUnary(tokens, pos); }
  return parseAtom(tokens, pos);
}

function parseAtom(tokens: string[], pos: { i: number }): number {
  if (pos.i >= tokens.length) throw new Error('Unexpected end of expression');
  const tok = tokens[pos.i];

  if (tok === '(') {
    pos.i++;
    const val = parseExpr(tokens, pos);
    if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
    return val;
  }

  if (/^[0-9.]/.test(tok)) { pos.i++; return parseFloat(tok); }

  if (/^[a-zA-Z_]/.test(tok)) {
    const name = tok.toLowerCase();
    pos.i++;

    if (name === 'pi' || name === 'π') return Math.PI;
    if (name === 'e' && (pos.i >= tokens.length || tokens[pos.i] !== '(')) return Math.E;

    if (pos.i < tokens.length && tokens[pos.i] === '(') {
      pos.i++;
      const args: number[] = [parseExpr(tokens, pos)];
      while (pos.i < tokens.length && tokens[pos.i] === ',') {
        pos.i++;
        args.push(parseExpr(tokens, pos));
      }
      if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
      const v = args[0];
      const v2 = args[1];

      switch (name) {
        case 'sin': return Math.sin(v);
        case 'cos': return Math.cos(v);
        case 'tan': return Math.tan(v);
        case 'asin': return Math.asin(v);
        case 'acos': return Math.acos(v);
        case 'atan': return v2 !== undefined ? Math.atan2(v, v2) : Math.atan(v);
        case 'sinh': return Math.sinh(v);
        case 'cosh': return Math.cosh(v);
        case 'tanh': return Math.tanh(v);
        case 'sqrt': return Math.sqrt(v);
        case 'cbrt': return Math.cbrt(v);
        case 'abs': return Math.abs(v);
        case 'ceil': return Math.ceil(v);
        case 'floor': return Math.floor(v);
        case 'round': return Math.round(v);
        case 'log': case 'log10': return Math.log10(v);
        case 'ln': return Math.log(v);
        case 'log2': return Math.log2(v);
        case 'exp': return Math.exp(v);
        case 'sign': return Math.sign(v);
        case 'pow': return Math.pow(v, v2 ?? 0);
        case 'min': return Math.min(...args);
        case 'max': return Math.max(...args);
        case 'mod': return v % (v2 ?? 1);
        default: throw new Error(`Unknown function: ${name}()`);
      }
    }

    throw new Error(`Unknown identifier: ${name}`);
  }

  throw new Error(`Unexpected token: ${tok}`);
}

function evaluateExpression(expr: string, angle: string): number {
  const cleaned = expr
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/π/g, 'pi');

  // Convert trig args from degrees to radians if angle mode is deg
  let processed = cleaned;
  if (angle === 'deg') {
    processed = processed.replace(/\b(sin|cos|tan|asin|acos|atan)\(([^)]+)\)/g, (_, fn: string, arg: string) => {
      if (fn.startsWith('a')) return `${fn}((${arg})*180/pi)`;
      return `${fn}(((${arg})*pi)/180)`;
    });
  }

  const tokens = tokenize(processed);
  if (tokens.length === 0) throw new Error('Empty expression');
  const pos = { i: 0 };
  const result = parseExpr(tokens, pos);
  if (pos.i < tokens.length) throw new Error(`Unexpected token: ${tokens[pos.i]}`);
  return result;
}

// ── API Handler ──────────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (!checkRateLimit(req, res, 60, 60_000)) return;

  // Authenticate API key (optional — allows demo usage without key)
  const authHeader = getHeader(req, 'Authorization');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer calc_live_')) {
    userId = await authenticateApiKey(req, res);
    if (userId === null) return;
  }

  try {
    let expr: string | undefined;
    let angle: string = 'rad';

    if (req.method === 'GET') {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      expr = url.searchParams.get('expr') ?? undefined;
      angle = url.searchParams.get('angle') ?? 'rad';
    } else if (req.method === 'POST') {
      const body = await readBody(req);
      expr = body?.expr;
      angle = body?.angle ?? 'rad';
    }

    if (!expr || typeof expr !== 'string') {
      return jsonResponse(res, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing "expr" parameter. Try GET /api/evaluate?expr=sin(45 deg)+cos(30 deg) or POST {"expr":"2+2","angle":"rad"}',
        },
      }, 422);
    }

    if (expr.length > 1024) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Expression too long (max 1024 characters)' } }, 422);
    }

    const result = evaluateExpression(expr, angle);

    // Track usage (fire and forget)
    if (userId) {
      db.insert(usageEvents).values({ userId, type: 'evaluate', count: 1, metadata: { expr: expr.slice(0, 128) } }).catch(() => {});
    }

    return jsonResponse(res, {
      result: Number.isFinite(result) ? result : String(result),
      expression: expr,
      angle,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Evaluation error';
    return jsonResponse(res, { error: { code: 'EVALUATION_ERROR', message: msg } }, 422);
  }
}

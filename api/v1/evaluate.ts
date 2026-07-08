import type { IncomingMessage, ServerResponse } from 'http';
import { jsonResponse, readBody, getHeader } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { authenticateApiKey } from '../_lib/auth';

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
    } else if ('+-*/^(),'.includes(expr[i])) {
      tokens.push(expr[i]); i++;
    } else {
      throw new Error(`Unexpected character: ${expr[i]}`);
    }
  }
  return tokens;
}

function parse(tokens: string[], pos: { i: number }): number {
  let left = parseMul(pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '+' || tokens[pos.i] === '-')) {
    const op = tokens[pos.i++];
    const right = parseMul(pos);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function parseMul(pos: { i: number }): number {
  let left = parsePow(pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '*' || tokens[pos.i] === '/')) {
    const op = tokens[pos.i++];
    const right = parsePow(pos);
    left = op === '*' ? left * right : left / right;
  }
  return left;
}

function parsePow(pos: { i: number }): number {
  let left = parseUnary(pos);
  if (pos.i < tokens.length && tokens[pos.i] === '^') {
    pos.i++;
    const right = parsePow(pos);
    left = Math.pow(left, right);
  }
  return left;
}

function parseUnary(pos: { i: number }): number {
  if (pos.i < tokens.length && tokens[pos.i] === '-') { pos.i++; return -parseUnary(pos); }
  if (pos.i < tokens.length && tokens[pos.i] === '+') { pos.i++; return parseUnary(pos); }
  return parseAtom(pos);
}

function parseAtom(pos: { i: number }): number {
  if (pos.i >= tokens.length) throw new Error('Unexpected end of expression');
  const tok = tokens[pos.i];

  if (tok === '(') {
    pos.i++;
    const val = parse(pos, { i: pos.i });
    pos.i = val.pos;
    if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
    return val.result;
  }

  if (/^[0-9.]/.test(tok)) { pos.i++; return parseFloat(tok); }

  if (/^[a-zA-Z_]/.test(tok)) {
    const name = tok.toLowerCase();
    pos.i++;

    // Constants
    if (name === 'pi' || name === 'π') return Math.PI;
    if (name === 'e') return Math.E;

    // Functions: expect ( arg )
    if (pos.i < tokens.length && tokens[pos.i] === '(') {
      pos.i++;
      const arg = parse(pos, { i: pos.i });
      pos.i = arg.pos;
      if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
      const v = arg.result;

      switch (name) {
        case 'sin': return Math.sin(v);
        case 'cos': return Math.cos(v);
        case 'tan': return Math.tan(v);
        case 'asin': return Math.asin(v);
        case 'acos': return Math.acos(v);
        case 'atan': return Math.atan(v);
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
        default: throw new Error(`Unknown function: ${name}`);
      }
    }

    throw new Error(`Unknown identifier: ${name}`);
  }

  throw new Error(`Unexpected token: ${tok}`);
}

function evaluateExpression(expr: string): number {
  const cleaned = expr
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/π/g, 'pi');
  const tokens = tokenize(cleaned);
  if (tokens.length === 0) throw new Error('Empty expression');
  const pos = { i: 0 };
  const result = parse(tokens, pos);
  if (pos.i < tokens.length) throw new Error(`Unexpected token: ${tokens[pos.i]}`);
  return result;
}

// ── API Handler ──────────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  // Rate limit: 60 evals/min per IP
  if (!checkRateLimit(req, res, 60, 60_000)) return;

  // Authenticate API key (optional for demo expressions)
  const authHeader = getHeader(req, 'Authorization');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer calc_live_')) {
    userId = await authenticateApiKey(req, res);
    if (userId === null) return; // auth already sent error response
  }

  try {
    let expr: string | undefined;
    let angleMode: 'rad' | 'deg' = 'rad';

    if (req.method === 'GET') {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      expr = url.searchParams.get('expr') ?? undefined;
      angleMode = (url.searchParams.get('angle') as 'rad' | 'deg') ?? 'rad';
    } else if (req.method === 'POST') {
      const body = await readBody(req);
      expr = body?.expr;
      angleMode = body?.angle ?? 'rad';
    }

    if (!expr || typeof expr !== 'string') {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Missing "expr" parameter. Send ?expr=sin(45)+cos(30) or {"expr":"sin(45)+cos(30)"}' } }, 422);
    }

    if (expr.length > 1024) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Expression too long (max 1024 characters)' } }, 422);
    }

    // Convert degree trig functions if angle mode is deg
    let processedExpr = expr;
    if (angleMode === 'deg') {
      processedExpr = processedExpr.replace(/\b(sin|cos|tan|asin|acos|atan)\(/g, (_, fn: string) => `${fn}(`);
      // Wrap trig args in deg-to-rad conversion
      processedExpr = processedExpr.replace(/\b(sin|cos|tan)\(([^)]+)\)/g, (_, fn: string, arg: string) => `${fn}((${arg})*pi/180)`);
    }

    const result = evaluateExpression(processedExpr);

    // Track usage
    if (userId) {
      try {
        const { db } = await import('../_lib/db');
        const { usageEvents } = await import('../_lib/schema');
        await db.insert(usageEvents).values({ userId, type: 'evaluate', count: 1, metadata: { expr: expr.slice(0, 128) } });
      } catch { /* don't fail the request if tracking fails */ }
    }

    return jsonResponse(res, {
      result: Number.isFinite(result) ? result : String(result),
      expression: expr,
      angle: angleMode,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Evaluation error';
    return jsonResponse(res, { error: { code: 'EVALUATION_ERROR', message: msg } }, 422);
  }
}

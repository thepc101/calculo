export type TokenType =
  | 'number'
  | 'string'
  | 'identifier'
  | 'operator'
  | 'function'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'dot'
  | 'equals'
  | 'semicolon'
  | 'lbracket'
  | 'rbracket'
  | 'power'
  | 'factorial'
  | 'percent'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

const KEYWORDS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'log', 'ln', 'log2', 'log10', 'sqrt', 'cbrt', 'abs',
  'floor', 'ceil', 'round', 'trunc', 'sign', 'exp',
  'min', 'max', 'mod', 'gcd', 'lcm',
  'PI', 'E', 'TAU', 'PHI', 'INFINITY',
  're', 'im', 'conj', 'arg', 'norm',
  'det', 'inv', 'transpose', 'trace',
  'sinh', 'cosh', 'tanh',
  'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan',
]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(', position: i });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')', position: i });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: ',', position: i });
      i++;
      continue;
    }

    if (char === ';') {
      tokens.push({ type: 'semicolon', value: ';', position: i });
      i++;
      continue;
    }

    if (char === '[') {
      tokens.push({ type: 'lbracket', value: '[', position: i });
      i++;
      continue;
    }

    if (char === ']') {
      tokens.push({ type: 'rbracket', value: ']', position: i });
      i++;
      continue;
    }

    if (char === '%') {
      tokens.push({ type: 'percent', value: '%', position: i });
      i++;
      continue;
    }

    if (char === '!' && input[i + 1] !== '=') {
      tokens.push({ type: 'factorial', value: '!', position: i });
      i++;
      continue;
    }

    if (char === '=') {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'operator', value: '==', position: i });
        i += 2;
      } else {
        tokens.push({ type: 'equals', value: '=', position: i });
        i++;
      }
      continue;
    }

    if (char === '^') {
      tokens.push({ type: 'power', value: '^', position: i });
      i++;
      continue;
    }

    if ('+-*/'.includes(char)) {
      tokens.push({ type: 'operator', value: char, position: i });
      i++;
      continue;
    }

    if (char === '<' || char === '>') {
      const next = input[i + 1];
      if (next === '=') {
        tokens.push({ type: 'operator', value: char + '=', position: i });
        i += 2;
      } else {
        tokens.push({ type: 'operator', value: char, position: i });
        i++;
      }
      continue;
    }

    if (char === '.' && i + 1 < input.length && /\d/.test(input[i + 1]!)) {
      let num = '.';
      i++;
      while (i < input.length && /\d/.test(input[i]!)) {
        num += input[i];
        i++;
      }
      tokens.push({ type: 'number', value: num, position: i - num.length });
      continue;
    }

    if (/\d/.test(char)) {
      let num = '';
      while (i < input.length && /\d/.test(input[i]!)) {
        num += input[i];
        i++;
      }
      if (i < input.length && input[i] === '.' && i + 1 < input.length && /\d/.test(input[i + 1]!)) {
        num += '.';
        i++;
        while (i < input.length && /\d/.test(input[i]!)) {
          num += input[i];
          i++;
        }
      }
      if (i < input.length && (input[i] === 'e' || input[i] === 'E')) {
        num += input[i];
        i++;
        if (i < input.length && (input[i] === '+' || input[i] === '-')) {
          num += input[i];
          i++;
        }
        while (i < input.length && /\d/.test(input[i]!)) {
          num += input[i];
          i++;
        }
      }
      tokens.push({ type: 'number', value: num, position: i - num.length });
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          str += input[i + 1];
          i += 2;
        } else {
          str += input[i];
          i++;
        }
      }
      if (i < input.length) i++;
      tokens.push({ type: 'string', value: str, position: i - str.length - 2 });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]!)) {
        ident += input[i];
        i++;
      }
      const type = KEYWORDS.has(ident) ? 'function' : 'identifier';
      tokens.push({ type, value: ident, position: i - ident.length });
      continue;
    }

    throw new Error(`Unexpected character '${char}' at position ${i}`);
  }

  tokens.push({ type: 'eof', value: '', position: i });
  return tokens;
}

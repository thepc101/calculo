import type { Token } from './tokenizer';
import { tokenize } from './tokenizer';
import type { AstNode } from './ast';
import { ParseError } from '@calculo/shared';

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(input: string): AstNode {
    this.tokens = tokenize(input);
    this.pos = 0;
    const result = this.parseExpression();
    if (this.peek().type !== 'eof') {
      throw new ParseError(`Unexpected token '${this.peek().value}' at position ${this.peek().position}`);
    }
    return result;
  }

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private consume(): Token {
    return this.tokens[this.pos++]!;
  }

  private expect(type: string): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new ParseError(`Expected ${type} but got '${token.value}' at position ${token.position}`);
    }
    return this.consume();
  }

  private parseExpression(): AstNode {
    let left = this.parseAssignment();

    while (this.peek().type === 'operator' && this.peek().value === '=') {
      this.consume();
      const right = this.parseExpression();
      left = { type: 'binary', operator: '==', left, right };
    }

    return left;
  }

  private parseAssignment(): AstNode {
    if (this.peek().type === 'identifier' && this.tokens[this.pos + 1]?.type === 'equals') {
      const name = this.consume().value;
      this.consume();
      const value = this.parseExpression();
      return { type: 'assignment', variable: name, value };
    }
    return this.parseConditional();
  }

  private parseConditional(): AstNode {
    let expr = this.parseLogicalOr();

    if (this.peek().type === 'operator' && this.peek().value === '?') {
      this.consume();
      const consequent = this.parseExpression();
      this.expect('operator');
      const alternate = this.parseExpression();
      expr = { type: 'conditional', condition: expr, consequent, alternate };
    }

    return expr;
  }

  private parseLogicalOr(): AstNode {
    let left = this.parseLogicalAnd();

    while (this.peek().type === 'operator' && this.peek().value === '||') {
      const op = this.consume().value;
      const right = this.parseLogicalAnd();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  private parseLogicalAnd(): AstNode {
    let left = this.parseComparison();

    while (this.peek().type === 'operator' && this.peek().value === '&&') {
      const op = this.consume().value;
      const right = this.parseComparison();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  private parseComparison(): AstNode {
    let left = this.parseAddSubtract();
    const comparisonOps = new Set(['<', '>', '<=', '>=', '==', '!=']);

    while (this.peek().type === 'operator' && comparisonOps.has(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseAddSubtract();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  private parseAddSubtract(): AstNode {
    let left = this.parseMultiplyDivide();

    while (this.peek().type === 'operator' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.parseMultiplyDivide();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  private parseMultiplyDivide(): AstNode {
    let left = this.parsePower();

    while (this.peek().type === 'operator' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value;
      const right = this.parsePower();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  private parsePower(): AstNode {
    let left = this.parseUnary();

    if (this.peek().type === 'power') {
      this.consume();
      const right = this.parseUnary();
      left = { type: 'binary', operator: '^', left, right };
    }

    return left;
  }

  private parseUnary(): AstNode {
    if (this.peek().type === 'operator' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const operand = this.parseUnary();
      return { type: 'unary', operator: op, operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.peek();

    if (token.type === 'number') {
      this.consume();
      return { type: 'number', value: parseFloat(token.value) };
    }

    if (token.type === 'string') {
      this.consume();
      return { type: 'string', value: token.value };
    }

    if (token.type === 'lparen') {
      this.consume();
      const expr = this.parseExpression();
      this.expect('rparen');
      return expr;
    }

    if (token.type === 'lbracket') {
      return this.parseMatrix();
    }

    if (token.type === 'function') {
      const name = this.consume().value;
      this.expect('lparen');
      const args: AstNode[] = [];
      if (this.peek().type !== 'rparen') {
        args.push(this.parseExpression());
        while (this.peek().type === 'comma') {
          this.consume();
          args.push(this.parseExpression());
        }
      }
      this.expect('rparen');
      return { type: 'function', name, args };
    }

    if (token.type === 'identifier') {
      const name = this.consume().value;
      if (this.peek().type === 'lparen') {
        this.consume();
        const args: AstNode[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek().type === 'comma') {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        this.expect('rparen');
        return { type: 'function', name, args };
      }
      return { type: 'identifier', name };
    }

    if (token.type === 'percent') {
      this.consume();
      return { type: 'number', value: 0.01 };
    }

    throw new ParseError(`Unexpected token '${token.value}' at position ${token.position}`);
  }

  private parseMatrix(): AstNode {
    this.consume();
    const rows: AstNode[][] = [];
    let row: AstNode[] = [];

    if (this.peek().type !== 'rbracket') {
      row.push(this.parseExpression());
      while (this.peek().type === 'comma') {
        this.consume();
        row.push(this.parseExpression());
      }
      if (this.peek().type === 'semicolon') {
        rows.push(row);
        this.consume();
        row = [];
        row.push(this.parseExpression());
        while (this.peek().type === 'comma') {
          this.consume();
          row.push(this.parseExpression());
        }
        rows.push(row);
        while (this.peek().type === 'semicolon') {
          this.consume();
          row = [];
          row.push(this.parseExpression());
          while (this.peek().type === 'comma') {
            this.consume();
            row.push(this.parseExpression());
          }
          rows.push(row);
        }
      } else {
        rows.push(row);
      }
    }

    this.expect('rbracket');

    if (rows.length === 1) {
      return { type: 'vector', elements: row };
    }

    return { type: 'matrix', rows };
  }
}

export function parse(input: string): AstNode {
  const parser = new Parser();
  return parser.parse(input);
}

import type { AstNode } from '@calculo/parser';
import { parse } from '@calculo/parser';
import { EvaluationError } from '@calculo/shared';
import { Environment } from './environment';
import { builtInFunctions } from './functions';
import type { Complex, Matrix } from '@calculo/shared';

export class Evaluator {
  constructor(private env: Environment) {}

  evaluate(node: AstNode): number | Complex | Matrix | number[] {
    switch (node.type) {
      case 'number':
        return node.value;

      case 'string':
        return node.value as unknown as number;

      case 'identifier': {
        const value = this.env.getVariable(node.name);
        if (value === undefined) {
          throw new EvaluationError(`Undefined variable: ${node.name}`);
        }
        return value;
      }

      case 'unary': {
        const operand = this.evaluate(node.operand) as number;
        switch (node.operator) {
          case '-': return -operand;
          case '+': return operand;
          case '!': return this.factorial(operand);
          default: throw new EvaluationError(`Unknown unary operator: ${node.operator}`);
        }
      }

      case 'binary': {
        const left = this.evaluate(node.left) as number;
        const right = this.evaluate(node.right) as number;
        return this.evaluateBinary(node.operator, left, right);
      }

      case 'function': {
        const args = node.args.map((a) => this.evaluate(a) as number);
        return this.evaluateFunction(node.name, args);
      }

      case 'assignment': {
        const value = this.evaluate(node.value) as number;
        this.env.setVariable(node.variable, value);
        this.env.pushMemory(value);
        return value;
      }

      case 'vector': {
        return node.elements.map((e) => this.evaluate(e) as number);
      }

      case 'matrix': {
        const data = node.rows.map((row) => row.map((cell) => this.evaluate(cell) as number));
        return { rows: data.length, cols: data[0]!.length, data };
      }

      case 'conditional': {
        const condition = this.evaluate(node.condition) as number;
        if (condition) {
          return this.evaluate(node.consequent);
        }
        if (node.alternate) {
          return this.evaluate(node.alternate);
        }
        return 0;
      }

      default:
        throw new EvaluationError(`Unknown node type: ${(node as AstNode).type}`);
    }
  }

  private evaluateBinary(op: string, left: number, right: number): number {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': {
        if (right === 0) throw new EvaluationError('Division by zero');
        return left / right;
      }
      case '^': return Math.pow(left, right);
      case '%': return left % right;
      case '<': return left < right ? 1 : 0;
      case '>': return left > right ? 1 : 0;
      case '<=': return left <= right ? 1 : 0;
      case '>=': return left >= right ? 1 : 0;
      case '==': return left === right ? 1 : 0;
      case '!=': return left !== right ? 1 : 0;
      case '&&': return left && right ? 1 : 0;
      case '||': return left || right ? 1 : 0;
      default: throw new EvaluationError(`Unknown operator: ${op}`);
    }
  }

  private evaluateFunction(name: string, args: number[]): number {
    const builtIn = builtInFunctions[name];
    if (builtIn) {
      return builtIn(args, this.env.angleMode);
    }

    const userFn = this.env.getFunction(name);
    if (userFn) {
      if (args.length !== userFn.params.length) {
        throw new EvaluationError(
          `Function ${name} expects ${userFn.params.length} arguments but got ${args.length}`,
        );
      }
      const childEnv = this.env.clone();
      userFn.params.forEach((param, i) => {
        childEnv.setVariable(param, args[i]!);
      });
      const childEvaluator = new Evaluator(childEnv);
      const ast = parse(userFn.body);
      return childEvaluator.evaluate(ast) as number;
    }

    throw new EvaluationError(`Unknown function: ${name}`);
  }

  private factorial(n: number): number {
    if (n < 0) throw new EvaluationError('Factorial of negative number');
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }
}

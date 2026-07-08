import { Parser } from '@calculo/parser';
import type { EvaluationRequest, EvaluationResult } from '@calculo/shared';
import { Environment } from './environment';
import { Evaluator } from './evaluator';

export class CalculatorEngine {
  private parser = new Parser();

  evaluate(request: EvaluationRequest): EvaluationResult {
    const env = new Environment();
    env.angleMode = request.angleMode ?? 'rad';
    env.precision = request.precision ?? 12;

    if (request.variables) {
      for (const [key, value] of Object.entries(request.variables)) {
        env.setVariable(key, value);
      }
    }

    try {
      const ast = this.parser.parse(request.expression);
      const evaluator = new Evaluator(env);
      const result = evaluator.evaluate(ast);

      return {
        result: result as number,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        result: NaN,
        error: message,
      };
    }
  }
}

export function createEngine(): CalculatorEngine {
  return new CalculatorEngine();
}

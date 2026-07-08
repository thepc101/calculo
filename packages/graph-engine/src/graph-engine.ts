import { Parser } from '@calculo/parser';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { GraphRequest, GraphExpression, GraphBounds, Point2D, Point3D, GraphData } from '@calculo/shared';

export class GraphEngine {
  private parser = new Parser();
  private calcEngine = new CalculatorEngine();

  generatePoints(expression: GraphExpression, bounds: GraphBounds): GraphData {
    switch (expression.type ?? 'cartesian') {
      case 'cartesian':
        return this.generateCartesian(expression.expression, bounds);
      case 'parametric':
        return this.generateParametric(expression.expression, bounds);
      case 'polar':
        return this.generatePolar(expression.expression, bounds);
      default:
        return this.generateCartesian(expression.expression, bounds);
    }
  }

  private generateCartesian(expr: string, bounds: GraphBounds): GraphData {
    const points: Point2D[] = [];
    const step = (bounds.xMax - bounds.xMin) / 800;

    for (let x = bounds.xMin; x <= bounds.xMax; x += step) {
      const result = this.calcEngine.evaluate({
        expression: expr,
        variables: { x },
      });
      if (!result.error && isFinite(result.result as number)) {
        points.push({ x, y: result.result as number });
      }
    }

    return { points };
  }

  private generateParametric(expr: string, bounds: GraphBounds): GraphData {
    const points: Point2D[] = [];
    const parts = expr.split(',').map((s) => s.trim());
    if (parts.length !== 2) return { points };

    const [xExpr, yExpr] = parts;
    const step = (bounds.xMax - bounds.xMin) / 800;

    for (let t = bounds.xMin; t <= bounds.xMax; t += step) {
      const xResult = this.calcEngine.evaluate({
        expression: xExpr!,
        variables: { t },
      });
      const yResult = this.calcEngine.evaluate({
        expression: yExpr!,
        variables: { t },
      });
      if (!xResult.error && !yResult.error && isFinite(xResult.result as number) && isFinite(yResult.result as number)) {
        points.push({ x: xResult.result as number, y: yResult.result as number });
      }
    }

    return { points };
  }

  private generatePolar(expr: string, bounds: GraphBounds): GraphData {
    const points: Point2D[] = [];
    const step = (2 * Math.PI) / 800;

    for (let theta = 0; theta <= 2 * Math.PI; theta += step) {
      const result = this.calcEngine.evaluate({
        expression: expr,
        variables: { theta },
      });
      if (!result.error && isFinite(result.result as number)) {
        const r = result.result as number;
        points.push({
          x: r * Math.cos(theta),
          y: r * Math.sin(theta),
        });
      }
    }

    return { points };
  }

  generateAll(request: GraphRequest): GraphData[] {
    const bounds = request.bounds ?? { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
    return request.expressions.map((expr) => this.generatePoints(expr, bounds));
  }
}

export function createGraphEngine(): GraphEngine {
  return new GraphEngine();
}

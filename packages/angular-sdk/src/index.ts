import { Injectable } from '@angular/core';
import { Calculo } from '@calculo/sdk';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { EvaluationRequest, EvaluationResult, CalculatorConfig, ThemeConfig } from '@calculo/shared';

const engine = new CalculatorEngine();

@Injectable({ providedIn: 'root' })
export class CalculoService {
  private client: Calculo | null = null;
  lastResult: number | null = null;
  lastError: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) this.client = new Calculo(apiKey);
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult | null> {
    this.lastError = null;
    try {
      if (this.client) {
        const res = await this.client.evaluate(request);
        this.lastResult = res.result as number;
        return res;
      }
      const res = engine.evaluate(request);
      if (res.error) {
        this.lastError = res.error;
        return null;
      }
      this.lastResult = res.result as number;
      return res;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Evaluation failed';
      return null;
    }
  }

  evaluateSync(request: EvaluationRequest): EvaluationResult | null {
    this.lastError = null;
    const res = engine.evaluate(request);
    if (res.error) {
      this.lastError = res.error;
      return null;
    }
    this.lastResult = res.result as number;
    return res;
  }
}

export { Calculo } from '@calculo/sdk';
export type { CalculatorConfig, ThemeConfig, EvaluationRequest };

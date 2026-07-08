import { writable, type Writable } from 'svelte/store';
import { Calculo } from '@calculo/sdk';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { EvaluationRequest, CalculatorConfig, ThemeConfig } from '@calculo/shared';

const engine = new CalculatorEngine();

export function useCalculo(apiKey?: string) {
  const result = writable<number | null>(null);
  const error = writable<string | null>(null);
  const loading = writable(false);
  const client = apiKey ? new Calculo(apiKey) : null;

  const evaluate = async (request: EvaluationRequest) => {
    loading.set(true);
    error.set(null);
    try {
      if (client) {
        const res = await client.evaluate(request);
        result.set(res.result as number);
        return res;
      }
      const res = engine.evaluate(request);
      if (res.error) {
        error.set(res.error);
        return null;
      }
      result.set(res.result as number);
      return res;
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Evaluation failed');
      return null;
    } finally {
      loading.set(false);
    }
  };

  const evaluateSync = (request: EvaluationRequest) => {
    error.set(null);
    const res = engine.evaluate(request);
    if (res.error) {
      error.set(res.error);
      return null;
    }
    result.set(res.result as number);
    return res;
  };

  const clear = () => {
    result.set(null);
    error.set(null);
  };

  return { evaluate, evaluateSync, result, error, loading, clear };
}

export { Calculo } from '@calculo/sdk';

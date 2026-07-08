import { ref, computed, type Ref } from 'vue';
import { Calculo } from '@calculo/sdk';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { EvaluationRequest, CalculatorConfig, ThemeConfig } from '@calculo/shared';

const engine = new CalculatorEngine();

export function useCalculo(apiKey?: string) {
  const result = ref<number | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const client = apiKey ? new Calculo(apiKey) : null;

  const evaluate = async (request: EvaluationRequest) => {
    loading.value = true;
    error.value = null;
    try {
      if (client) {
        const res = await client.evaluate(request);
        result.value = res.result as number;
        return res;
      }
      const res = engine.evaluate(request);
      if (res.error) {
        error.value = res.error;
        return null;
      }
      result.value = res.result as number;
      return res;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Evaluation failed';
      return null;
    } finally {
      loading.value = false;
    }
  };

  const evaluateSync = (request: EvaluationRequest) => {
    error.value = null;
    const res = engine.evaluate(request);
    if (res.error) {
      error.value = res.error;
      return null;
    }
    result.value = res.result as number;
    return res;
  };

  const clear = () => {
    result.value = null;
    error.value = null;
  };

  return { evaluate, evaluateSync, result, error, loading, clear };
}

export { Calculo } from '@calculo/sdk';

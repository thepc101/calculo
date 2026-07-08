import { useState, useCallback } from 'react';
import { Calculo } from '@calculo/sdk';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { EvaluationRequest, CalculatorConfig, ThemeConfig } from '@calculo/shared';

const engine = new CalculatorEngine();
let clientInstance: Calculo | null = null;

function getClient(apiKey?: string): Calculo {
  if (!clientInstance && apiKey) {
    clientInstance = new Calculo(apiKey);
  }
  return clientInstance ?? new Calculo('local');
}

export function useCalculo(apiKey?: string) {
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const evaluate = useCallback(async (request: EvaluationRequest) => {
    setLoading(true);
    setError(null);
    try {
      if (apiKey) {
        const client = getClient(apiKey);
        const res = await client.evaluate(request);
        setResult(res.result as number);
        return res;
      }
      const res = engine.evaluate(request);
      if (res.error) {
        setError(res.error);
        return null;
      }
      setResult(res.result as number);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const evaluateSync = useCallback((request: EvaluationRequest) => {
    setError(null);
    const res = engine.evaluate(request);
    if (res.error) {
      setError(res.error);
      return null;
    }
    setResult(res.result as number);
    return res;
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { evaluate, evaluateSync, result, error, loading, clear };
}

export interface CalculatorProps {
  type?: 'basic' | 'scientific' | 'graphing' | 'financial' | 'programming' | 'custom';
  theme?: Partial<ThemeConfig>;
  graph?: boolean;
  history?: boolean;
  precision?: number;
}

export function Calculator({ type = 'basic', theme, graph, history, precision }: CalculatorProps) {
  const { evaluateSync, result, error } = useCalculo();
  return null;
}

export { Calculo } from '@calculo/sdk';

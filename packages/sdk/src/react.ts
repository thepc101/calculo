import { Calculo } from './sdk';
import type { EvaluationRequest, EvaluationResult } from '@calculo/shared';

export function createReactSDK(apiKey: string, options?: { baseUrl?: string }) {
  const client = new Calculo(apiKey, options);

  return {
    client,
    useEvaluate: (request: EvaluationRequest) => {
      return {
        queryKey: ['evaluate', request.expression, request.variables],
        queryFn: () => client.evaluate(request),
      };
    },
  };
}

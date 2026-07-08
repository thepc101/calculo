import type { EvaluationRequest, EvaluationResult, CalculatorConfig, EmbedConfig, ApiKey } from '@calculo/shared';

export class Calculo {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, options?: { baseUrl?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? 'https://api.calculo.dev';
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message ?? `HTTP ${response.status}`);
    }

    return response.json();
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    return this.request<EvaluationResult>('POST', '/v1/evaluate', request);
  }

  async createCalculator(config: CalculatorConfig) {
    return this.request('POST', '/v1/calculators', config);
  }

  async getCalculator(id: string) {
    return this.request('GET', `/v1/calculators/${id}`);
  }

  async updateCalculator(id: string, config: Partial<CalculatorConfig>) {
    return this.request('PATCH', `/v1/calculators/${id}`, config);
  }

  async deleteCalculator(id: string) {
    return this.request('DELETE', `/v1/calculators/${id}`);
  }

  async createEmbed(config: EmbedConfig) {
    return this.request('POST', '/v1/embed', config);
  }

  async getTemplates() {
    return this.request('GET', '/v1/templates');
  }

  async getUsage() {
    return this.request('GET', '/v1/usage');
  }

  async createApiKey(name: string, projectId: string) {
    return this.request<ApiKey>('POST', '/v1/api-keys', { name, projectId });
  }

  async getProjects() {
    return this.request('GET', '/v1/projects');
  }
}

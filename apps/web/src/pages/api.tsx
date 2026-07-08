import { CodeBlock } from '../components/code-block';

const endpoints = [
  {
    method: 'POST',
    path: '/v1/evaluate',
    description: 'Evaluate a mathematical expression',
    request: `{
  "expression": "sin(pi/2) + 2^8",
  "variables": { "x": 42 },
  "precision": 12,
  "angleMode": "rad"
}`,
    response: `{
  "result": 257,
  "steps": []
}`,
  },
  {
    method: 'POST',
    path: '/v1/render',
    description: 'Generate graph data from expressions',
    request: `{
  "expressions": [
    { "expression": "sin(x)", "color": "#3b82f6" },
    { "expression": "cos(x)", "color": "#10b981" }
  ],
  "bounds": {
    "xMin": -10, "xMax": 10,
    "yMin": -2, "yMax": 2
  }
}`,
    response: `{
  "graphs": [
    {
      "points": [
        { "x": -10, "y": 0.544 },
        { "x": -9.975, "y": 0.519 }
      ]
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/v1/calculators',
    description: 'Create a calculator configuration',
    request: `{
  "type": "scientific",
  "theme": { "mode": "dark", "primaryColor": "#3b82f6" },
  "width": "100%",
  "height": 600,
  "precision": 12,
  "graph": true
}`,
    response: `{
  "id": "calc_abc123",
  "status": "created"
}`,
  },
];

export function ApiPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-4">API Reference</h1>
      <p className="text-lg text-zinc-400 mb-12">
        Build, embed, and scale calculators with our REST API.
        All requests require authentication via Bearer token.
      </p>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-300 mb-4">
            Include your API key in the Authorization header:
          </p>
          <CodeBlock code={`Authorization: Bearer cal_your_api_key_here`} language="HTTP" />
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Base URL</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <CodeBlock code={`https://api.calculo.dev`} language="URL" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-8">Endpoints</h2>
      <div className="space-y-8">
        {endpoints.map((endpoint) => (
          <div key={endpoint.path} className="border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                endpoint.method === 'GET'
                  ? 'bg-blue-900/50 text-blue-400'
                  : 'bg-green-900/50 text-green-400'
              }`}>
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-zinc-200">{endpoint.path}</code>
            </div>
            <p className="text-sm text-zinc-400 mb-4">{endpoint.description}</p>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Request Body</h4>
                <pre className="bg-zinc-950 rounded-lg p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
                  <code>{endpoint.request}</code>
                </pre>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Response</h4>
                <pre className="bg-zinc-950 rounded-lg p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
                  <code>{endpoint.response}</code>
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">SDK Examples</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">JavaScript</h3>
            <CodeBlock code={`import { Calculo } from '@calculo/sdk';

const calculo = new Calculo(process.env.CALCULO_API_KEY);

const result = await calculo.evaluate({
  expression: 'sin(pi/2) + 2^8'
});

console.log(result);
// { result: 257 }`} language="TypeScript" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">curl</h3>
            <CodeBlock code={`curl https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_..." \\
  -H "Content-Type: application/json" \\
  -d '{"expression": "sin(pi/2) + 2^8"}'`} language="bash" />
          </div>
        </div>
      </div>
    </div>
  );
}

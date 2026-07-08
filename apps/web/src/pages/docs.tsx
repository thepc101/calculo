const sections = [
  {
    title: 'Getting Started',
    items: ['Installation', 'Quick Start', 'Authentication', 'API Keys', 'Projects'],
  },
  {
    title: 'Core Concepts',
    items: ['Calculators', 'Expressions', 'Variables', 'Functions', 'Themes'],
  },
  {
    title: 'Guides',
    items: ['Embedding', 'Graphing', 'Scientific Mode', 'Custom Buttons', 'Internationalization'],
  },
  {
    title: 'SDKs & Libraries',
    items: ['JavaScript SDK', 'React', 'Vue', 'Angular', 'Svelte', 'Web Component'],
  },
  {
    title: 'Platform',
    items: ['Dashboard', 'Analytics', 'Billing', 'Rate Limits', 'Error Codes'],
  },
];

export function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-[280px_1fr] gap-12">
        <aside className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-lg text-zinc-400 mb-8">
            Everything you need to build, embed, and scale calculators with calculo.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Quick Start</h2>
          <p className="text-zinc-300 mb-4">
            Get started with calculo in under 5 minutes. First, install the SDK:
          </p>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 overflow-x-auto">
            <code className="text-sm font-mono text-zinc-200">npm install @calculo/sdk</code>
          </pre>
          <p className="text-zinc-300 mb-4">
            Then create a client and start evaluating expressions:
          </p>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 overflow-x-auto">
            <code className="text-sm font-mono text-zinc-200">{`import { Calculo } from '@calculo/sdk';

const calculo = new Calculo(process.env.CALCULO_API_KEY);

const result = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2',
});

console.log(result); // { result: 1 }`}</code>
          </pre>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Embedding a Calculator</h2>
          <p className="text-zinc-300 mb-4">
            Embed a fully interactive calculator with a single line of HTML:
          </p>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 overflow-x-auto">
            <code className="text-sm font-mono text-zinc-200">{`<script src="https://cdn.calculo.dev/widget.js"></script>

<div
  data-calculator="calc_123"
  data-theme="dark"
  data-width="100%"
  data-height="650">
</div>`}</code>
          </pre>

          <h2 className="text-2xl font-semibold mt-12 mb-4">React Component</h2>
          <p className="text-zinc-300 mb-4">
            Use the React component for deep integration:
          </p>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 overflow-x-auto">
            <code className="text-sm font-mono text-zinc-200">{`import { Calculator } from '@calculo/react';

export function MortgageCalculator() {
  return (
    <Calculator
      type="financial"
      variables={[
        { name: 'principal', value: 300000 },
        { name: 'rate', value: 6.5 },
        { name: 'years', value: 30 },
      ]}
      theme={{
        mode: 'dark',
        primaryColor: '#10b981',
      }}
    />
  );
}`}</code>
          </pre>

          <h2 className="text-2xl font-semibold mt-12 mb-4">API Reference</h2>
          <div className="space-y-8">
            <div className="border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-900/50 text-green-400">POST</span>
                <code className="text-sm font-mono text-zinc-200">/v1/evaluate</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Evaluate a mathematical expression.
              </p>
              <pre className="bg-zinc-950 rounded-lg p-3 text-sm font-mono text-zinc-300 overflow-x-auto">
                <code>{`{
  "expression": "sin(pi/2) + 2^8",
  "variables": { "x": 42 },
  "precision": 12,
  "angleMode": "rad"
}`}</code>
              </pre>
            </div>

            <div className="border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-900/50 text-green-400">POST</span>
                <code className="text-sm font-mono text-zinc-200">/v1/render</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Render graph data from mathematical expressions.
              </p>
              <pre className="bg-zinc-950 rounded-lg p-3 text-sm font-mono text-zinc-300 overflow-x-auto">
                <code>{`{
  "expressions": [
    { "expression": "sin(x)", "color": "#3b82f6" },
    { "expression": "cos(x)", "color": "#10b981" }
  ],
  "bounds": {
    "xMin": -10, "xMax": 10,
    "yMin": -2, "yMax": 2
  }
}`}</code>
              </pre>
            </div>

            <div className="border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-900/50 text-green-400">POST</span>
                <code className="text-sm font-mono text-zinc-200">/v1/calculators</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Create a new calculator configuration.
              </p>
              <pre className="bg-zinc-950 rounded-lg p-3 text-sm font-mono text-zinc-300 overflow-x-auto">
                <code>{`{
  "type": "scientific",
  "theme": { "mode": "dark" },
  "precision": 12,
  "graph": true,
  "history": true,
  "variables": [],
  "functions": []
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

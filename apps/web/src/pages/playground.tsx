import { useState } from 'react';
import { DraggableCalculator } from '../components/draggable-calculator';
import { CodeBlock } from '../components/code-block';
import { CalculatorEngine } from '@calculo/calculator-engine';

const engine = new CalculatorEngine();

export function PlaygroundPage() {
  const [expression, setExpression] = useState('sin(pi/4)^2 + cos(pi/4)^2');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleEvaluate = () => {
    setError('');
    const evalResult = engine.evaluate({ expression });
    if (evalResult.error) {
      setError(evalResult.error);
      setResult('');
    } else {
      setResult(String(evalResult.result));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-4">Playground</h1>
      <p className="text-lg text-zinc-400 mb-12">
        Test expressions, explore the API, and generate code — all in your browser.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Expression</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEvaluate()}
                className="flex-1 h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="Enter an expression..."
              />
              <button
                onClick={handleEvaluate}
                className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Evaluate
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-900/50 text-sm text-red-400">
                {error}
              </div>
            )}
            {result && (
              <div className="mt-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Result</div>
                <div className="text-2xl font-semibold font-mono text-zinc-100">{result}</div>
              </div>
            )}
          </div>

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Interactive Calculator</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Drag to move · Resize from corner · Click <strong>Theme</strong> to switch styles
            </p>
            <DraggableCalculator />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">JavaScript SDK</h2>
            <CodeBlock
              code={`import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_...');

await calculo.evaluate({
  expression: ${JSON.stringify(expression)}
});`}
              language="TypeScript"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">curl</h2>
            <CodeBlock
              code={`curl -X POST https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_..." \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ expression })}'`}
              language="bash"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">React Component</h2>
            <CodeBlock
              code={`import { Calculator } from '@calculo/react';

<Calculator type="scientific" theme="dark" />`}
              language="TSX"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

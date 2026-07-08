import { useState, useEffect, useCallback } from 'react';
import { DraggableCalculator } from '../components/draggable-calculator';
import { CodeBlock } from '../components/code-block';
import { GraphCanvas } from '../components/graph-canvas';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { GraphExpression } from '../components/graph-canvas';

const engine = new CalculatorEngine();

const exampleExpressions = [
  'sin(pi/4)^2 + cos(pi/4)^2',
  'sqrt(144) + 3^3',
  'log(1000)',
  'ln(e^2)',
  '2 * pi * 6371',
  '(9/5) * 32 + 32',
  '5!',
  'nCr(10, 3)',
  'sin(x)',
  'x^2 - 4*x + 3',
  '1/x',
  'tan(x)',
];

export function PlaygroundPage() {
  const [expression, setExpression] = useState('sin(pi/4)^2 + cos(pi/4)^2');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ expr: string; result: string; error?: string }[]>([]);
  const [showGraph, setShowGraph] = useState(false);
  const [graphExpressions, setGraphExpressions] = useState<GraphExpression[]>([
    { id: '1', expression: 'sin(x)', color: '#3b82f6' },
  ]);

  const handleEvaluate = useCallback(() => {
    if (!expression.trim()) return;
    setError('');
    const evalResult = engine.evaluate({ expression: expression.trim() });
    if (evalResult.error) {
      setError(evalResult.error);
      setResult('');
      setHistory((prev) => [{ expr: expression, error: evalResult.error! }, ...prev].slice(0, 20));
    } else {
      setResult(String(evalResult.result));
      setHistory((prev) => [{ expr: expression, result: String(evalResult.result) }, ...prev].slice(0, 20));
    }
  }, [expression]);

  const addGraphExpression = () => {
    if (graphExpressions.length >= 6) return;
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
    setGraphExpressions((prev) => [
      ...prev,
      { id: String(Date.now()), expression: 'x', color: colors[prev.length % colors.length]! },
    ]);
  };

  const updateGraphExpression = (id: string, expression: string) => {
    setGraphExpressions((prev) => prev.map((e) => (e.id === id ? { ...e, expression } : e)));
  };

  const removeGraphExpression = (id: string) => {
    setGraphExpressions((prev) => prev.filter((e) => e.id !== id));
  };

  // Auto-update graph expressions in real-time
  const [debouncedGraphExprs, setDebouncedGraphExprs] = useState(graphExpressions);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGraphExprs(graphExpressions), 300);
    return () => clearTimeout(timer);
  }, [graphExpressions]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Playground</h1>
        <p className="text-lg text-zinc-400">
          Evaluate expressions, see graphs, and generate integration code — all in your browser.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left column: expression input + graph */}
        <div className="lg:col-span-3 space-y-6">
          <div className="border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Expression</h2>
              <button
                onClick={() => setShowGraph(!showGraph)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  showGraph
                    ? 'bg-blue-900/50 text-blue-400 border border-blue-800'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {showGraph ? 'Hide Graph' : 'Show Graph'}
              </button>
            </div>
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
                <div className="text-3xl font-semibold font-mono text-zinc-100">{result}</div>
              </div>
            )}
          </div>

          {showGraph && (
            <div className="border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Graph</h2>
                <button
                  onClick={addGraphExpression}
                  disabled={graphExpressions.length >= 6}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  + Add function
                </button>
              </div>
              <div className="space-y-3 mb-4">
                {graphExpressions.map((ge) => (
                  <div key={ge.id} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={ge.color}
                      onChange={(e) =>
                        setGraphExpressions((prev) =>
                          prev.map((x) => (x.id === ge.id ? { ...x, color: e.target.value } : x))
                        )
                      }
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={ge.expression}
                      onChange={(e) => updateGraphExpression(ge.id, e.target.value)}
                      className="flex-1 h-8 px-2 text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      placeholder="f(x) = ..."
                    />
                    {graphExpressions.length > 1 && (
                      <button
                        onClick={() => removeGraphExpression(ge.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <GraphCanvas expressions={debouncedGraphExprs} width={600} height={320} />
              </div>
            </div>
          )}

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-3 text-zinc-400">Try these</h2>
            <div className="flex flex-wrap gap-2">
              {exampleExpressions.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setExpression(ex); }}
                  className="px-2.5 py-1 text-xs font-mono rounded-md bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Interactive Calculator</h2>
            <DraggableCalculator initialMode="scientific" defaultTheme="dark" />
          </div>
        </div>

        {/* Right column: history + code snippets */}
        <div className="lg:col-span-2 space-y-6">
          {history.length > 0 && (
            <div className="border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-400">History</h2>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono py-1 border-b border-zinc-800/50 last:border-0">
                    <span className="text-zinc-400 truncate max-w-[60%]">{h.expr}</span>
                    <span className={h.error ? 'text-red-400' : 'text-zinc-200'}>
                      {h.error ? 'error' : `= ${h.result}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">JavaScript SDK</h2>
            <CodeBlock
              code={`import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('calc_live_...');

const { result } = await calculo.evaluate({
  expression: ${JSON.stringify(expression)}
});

console.log(result); // ${result || '...'}`}
              language="TypeScript"
            />
          </div>

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">REST API</h2>
            <CodeBlock
              code={`curl -X POST https://calculo-fawn.vercel.app/api/evaluate \\
  -H "Authorization: Bearer calc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ expression })}'`}
              language="bash"
            />
          </div>

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">React Component</h2>
            <CodeBlock
              code={`import { Calculator } from '@calculo/react';

export default function App() {
  return (
    <Calculator
      type="scientific"
      theme="dark"
    />
  );
}`}
              language="TSX"
            />
          </div>

          <div className="border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">HTML Embed</h2>
            <CodeBlock
              code={`<!-- 1. Add a container -->
<div data-calculator="demo_scientific"></div>

<!-- 2. Load the embed script -->
<script src="https://calculo-fawn.vercel.app/embed.js"><\/script>

<!-- The calculator loads automatically -->
<!-- Supports: demo_basic, demo_scientific,
     demo_graphing, demo_light, demo_cyberpunk -->`}
              language="HTML"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

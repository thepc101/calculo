import { DraggableCalculator } from '../components/draggable-calculator';
import { CodeBlock } from '../components/code-block';

const SITE = 'https://calculo-fawn.vercel.app';

const examples = [
  {
    title: 'Basic Calculator',
    description: 'Clean, fast arithmetic. Perfect for checkout flows, tip calculators, and simple forms.',
    mode: 'basic' as const,
    theme: 'dark' as const,
    embedId: 'demo_basic',
    config: { type: 'basic', theme: { mode: 'dark' } },
    embedCode: `<div data-calculator="demo_basic"></div>
<script src="${SITE}/embed.js"><\/script>`,
  },
  {
    title: 'Scientific Calculator',
    description: 'Full scientific functions — trig, logs, factorials, memory. Great for education and SaaS tools.',
    mode: 'scientific' as const,
    theme: 'dark' as const,
    embedId: 'demo_scientific',
    config: { type: 'scientific', theme: { mode: 'dark' } },
    embedCode: `<div data-calculator="demo_scientific"></div>
<script src="${SITE}/embed.js"><\/script>`,
  },
  {
    title: 'Light Theme',
    description: 'Embeddable calculators that match light UIs. Drop into any product page or doc site.',
    mode: 'scientific' as const,
    theme: 'light' as const,
    embedId: 'demo_light',
    config: { type: 'scientific', theme: { mode: 'light' } },
    embedCode: `<div data-calculator="demo_light"></div>
<script src="${SITE}/embed.js"><\/script>`,
  },
  {
    title: 'Graphing with Functions',
    description: 'Graph f(x) expressions in real time. Toggle the f(x) button in the calculator above.',
    mode: 'scientific' as const,
    theme: 'dark' as const,
    embedId: 'demo_graphing',
    config: { type: 'scientific', theme: { mode: 'dark' } },
    embedCode: `<div data-calculator="demo_graphing"></div>
<script src="${SITE}/embed.js"><\/script>`,
  },
];

export function ExamplesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Examples</h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Production-quality calculators built with calculo. Drag, resize, and theme each one.
          Copy the embed code to drop them into your site.
        </p>
      </div>

      <div className="space-y-24">
        {examples.map((example, i) => (
          <div key={example.title} className="grid lg:grid-cols-2 gap-12 items-start">
            <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
              <h2 className="text-2xl font-bold mb-3">{example.title}</h2>
              <p className="text-zinc-400 mb-6">{example.description}</p>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Configuration</h3>
                <CodeBlock
                  code={JSON.stringify(example.config, null, 2)}
                  language="json"
                />
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Embed Code</h3>
                <CodeBlock code={example.embedCode} language="html" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">React</h3>
                <CodeBlock
                  code={`import { Calculator } from '@calculo/react';

<Calculator
  type="${example.config.type}"
  theme="${example.config.theme.mode}"
/>`}
                  language="tsx"
                />
              </div>
            </div>

            <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
              <DraggableCalculator initialMode={example.mode} defaultTheme={example.theme} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Embed endpoint section ── */}
      <div className="mt-24 border-t border-zinc-800 pt-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Embed API</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Fetch any calculator config as JSON from the embed endpoint. Use it to build custom UIs or integrate with your platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold mb-3">REST Endpoint</h3>
            <CodeBlock
              code={`GET ${SITE}/api/embed/demo_scientific

# Returns JSON config:
{
  "id": "demo_scientific",
  "type": "scientific",
  "theme": { "mode": "dark", ... }
}`}
              language="bash"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold mb-3">Available Demo IDs</h3>
            <div className="space-y-2 text-sm font-mono">
              {['demo_basic', 'demo_scientific', 'demo_graphing', 'demo_light', 'demo_cyberpunk'].map((id) => (
                <div key={id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                  <span className="text-zinc-300">{id}</span>
                  <a href={`${SITE}/embed/${id}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    fetch →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-4xl mx-auto">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold mb-3">Custom Calculator</h3>
            <CodeBlock
              code={`# After creating a calculator via the API or dashboard:
curl ${SITE}/api/embed/calc_abc123

# Returns your custom config as JSON
# Use with the embed loader:
<div data-calculator="calc_abc123"></div>
<script src="${SITE}/embed.js"><\/script>`}
              language="bash"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

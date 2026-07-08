import { Link } from '@tanstack/react-router';
import { DraggableCalculator } from '../components/draggable-calculator';
import { CodeBlock } from '../components/code-block';

const quickStarts = [
  {
    title: 'npm install',
    code: `npm install @calculo/sdk`,
    lang: 'bash',
  },
  {
    title: 'Create a client & evaluate',
    code: `import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_your_api_key');

const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2'
});
// → { result: 1 }`,
    lang: 'TypeScript',
  },
  {
    title: 'Embed anywhere (HTML)',
    code: `<script src="https://cdn.calculo.dev/widget.js"></script>

<div data-calculator="calc_123"
     data-theme="dark"
     data-width="100%"
     data-height="650">
</div>`,
    lang: 'HTML',
  },
  {
    title: 'React component',
    code: `import { Calculator } from '@calculo/react';

export function Demo() {
  return (
    <Calculator
      type="scientific"
      theme={{ mode: 'dark' }}
      graph={true}
    />
  );
}`,
    lang: 'TSX',
  },
];

const apiEndpoints = [
  {
    method: 'POST',
    path: '/v1/evaluate',
    desc: 'Evaluate any mathematical expression',
    example: `curl https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_..." \\
  -H "Content-Type: application/json" \\
  -d '{"expression": "sin(pi/2) + 2^8"}'`,
  },
  {
    method: 'POST',
    path: '/v1/render',
    desc: 'Generate graph data from expressions',
    example: `curl https://api.calculo.dev/v1/render \\
  -H "Authorization: Bearer cal_..." \\
  -H "Content-Type: application/json" \\
  -d '{"expressions": [{"expression": "sin(x)"}]}'`,
  },
  {
    method: 'POST',
    path: '/v1/calculators',
    desc: 'Create a calculator configuration',
    example: `curl https://api.calculo.dev/v1/calculators \\
  -H "Authorization: Bearer cal_..." \\
  -H "Content-Type: application/json" \\
  -d '{"type": "scientific", "theme": {"mode": "dark"}}'`,
  },
];

const sdkLanguages = [
  { name: 'TypeScript', href: '/docs/sdk/typescript', desc: 'Full type safety & autocompletion' },
  { name: 'React', href: '/docs/sdk/react', desc: 'Hook-based components' },
  { name: 'Vue', href: '/docs/sdk/vue', desc: 'Composition API' },
  { name: 'Angular', href: '/docs/sdk/angular', desc: 'NgModule & standalone' },
  { name: 'Svelte', href: '/docs/sdk/svelte', desc: 'Reactive stores' },
  { name: 'curl', href: '/docs/sdk/curl', desc: 'REST API' },
  { name: 'Python', href: '/docs/sdk/python', desc: 'Coming soon' },
  { name: 'Go', href: '/docs/sdk/go', desc: 'Coming soon' },
];

const calcTypes = [
  { name: 'Basic', desc: 'Arithmetic, percentages, memory', icon: '+' },
  { name: 'Scientific', desc: 'Trig, log, complex numbers, matrices', icon: '∑' },
  { name: 'Graphing', desc: '2D, parametric, polar plots', icon: 'f(x)' },
  { name: 'Financial', desc: 'TVM, amortization, ROI', icon: '$' },
  { name: 'Programming', desc: 'Hex, bin, bitwise ops', icon: '0x' },
  { name: 'Custom', desc: 'Full JSON control over everything', icon: '⚙' },
];

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Open source &bull; MIT license &bull; v0.1.0
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="gradient-text">The infrastructure for calculations.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Build, embed, and scale calculators with one API.
              From simple arithmetic to complex scientific graphing —
              deploy in minutes, serve millions.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/docs"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-8 py-3 text-base font-semibold hover:bg-zinc-200 transition-colors"
              >
                Read the docs
              </Link>
              <Link
                to="/playground"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-8 py-3 text-base font-semibold hover:bg-zinc-800/50 transition-colors"
              >
                Try the playground
              </Link>
              <a
                href="https://github.com/thepc101/calculo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-5 py-3 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              Interactive demo
            </div>
            <h2 className="text-3xl font-bold mb-4">Try the calculator</h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Drag it around. Resize from the corner. Click <strong>Theme</strong> to switch
              between 8 live themes. Every calculator built with calculo is fully
              customizable — themes, size, layout, buttons, and behavior — all from a
              single JSON config.
            </p>
            <div className="border border-zinc-800 rounded-xl p-1 bg-zinc-900/30 inline-block text-xs text-zinc-600 mb-6">
              <span className="px-2 py-1">Drag · Resize · Theme · Evaluate</span>
            </div>
            <div className="mt-4">
              <DraggableCalculator />
            </div>
          </div>
          <div className="space-y-6 lg:pt-16">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-2">
              Quick start
            </div>
            {quickStarts.map((qs) => (
              <div key={qs.title}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">{qs.title}</span>
                </div>
                <CodeBlock code={qs.code} language={qs.lang} />
              </div>
            ))}
            <div className="pt-2">
              <Link
                to="/docs"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors inline-flex items-center gap-1"
              >
                View full documentation →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              Calculator types
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">Six calculator types, one API</h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
              Each type has a pre-built layout, button set, and behaviour. Override
              everything with JSON.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {calcTypes.map((ct) => (
              <div
                key={ct.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 card-hover flex items-start gap-4"
              >
                <span className="text-xl font-mono mt-0.5 text-zinc-400">{ct.icon}</span>
                <div>
                  <div className="font-semibold mb-1">{ct.name}</div>
                  <div className="text-sm text-zinc-400">{ct.desc}</div>
                  <Link to="/docs" className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 inline-block">
                    Configure →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              REST API
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">API-first by design</h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
              Every calculator feature is accessible via REST. Authenticate with Bearer
              tokens, get JSON back.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {apiEndpoints.map((ep) => (
              <div key={ep.path} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-900/50 text-green-400">
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
                </div>
                <p className="text-sm text-zinc-400 mb-4">{ep.desc}</p>
                <CodeBlock code={ep.example} language="bash" />
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/api"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              View full API reference →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              SDKs
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">SDKs for every framework</h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
              First-class SDKs with full type safety. Stripe-level developer experience.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sdkLanguages.map((lang) => (
              <Link
                key={lang.name}
                to={lang.href}
                className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 card-hover ${
                  lang.desc.includes('Coming soon') ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="font-semibold mb-1">{lang.name}</div>
                <div className="text-sm text-zinc-400">{lang.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
                Open source
              </div>
              <h2 className="text-3xl font-bold mb-4">Built in the open</h2>
              <p className="text-zinc-400 leading-relaxed mb-6">
                calculo is MIT-licensed and hosted on GitHub. We believe the
                infrastructure for calculations should be transparent, auditable,
                and community-driven. Contributions, issues, and feedback are
                welcome.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/thepc101/calculo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-800/50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Star on GitHub
                </a>
                <a
                  href="https://github.com/thepc101/calculo/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Report an issue
                </a>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-sm font-semibold mb-4">Project stats</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">License</span>
                  <span className="font-mono">MIT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Stack</span>
                  <span>React 19 · Hono · Drizzle · Supabase</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Package manager</span>
                  <span>pnpm workspaces</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Packages</span>
                  <span>10 (apps + libraries)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Engine</span>
                  <span>60+ built-in functions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to build?</h2>
            <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
              Start building with calculo in minutes. Read the docs, try the playground,
              or browse the source on GitHub.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/docs"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-8 py-3 text-base font-semibold hover:bg-zinc-200 transition-colors"
              >
                Read the docs
              </Link>
              <Link
                to="/playground"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-8 py-3 text-base font-semibold hover:bg-zinc-800/50 transition-colors"
              >
                Try the playground
              </Link>
              <a
                href="https://github.com/thepc101/calculo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 px-6 py-3 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

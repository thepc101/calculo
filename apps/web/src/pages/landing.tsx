import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
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
    code: `<div data-calculator="calc_123"
     data-theme="dark"
     data-width="100%"
     data-height="650">
</div>
<script src="https://cdn.calculo.dev/widget.js"></script>`,
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

const comparisonRows = [
  { feature: 'Free & open source', calculo: true, wolfram: false, symbolab: false, desmos: true },
  { feature: 'REST API', calculo: true, wolfram: true, symbolab: false, desmos: false },
  { feature: 'Self-hostable', calculo: true, wolfram: false, symbolab: false, desmos: false },
  { feature: 'Embed widgets', calculo: true, wolfram: false, symbolab: false, desmos: true },
  { feature: 'SDKs (React, Vue, etc.)', calculo: true, wolfram: false, symbolab: false, desmos: false },
  { feature: 'Graphing engine', calculo: true, wolfram: true, symbolab: true, desmos: true },
  { feature: 'Offline mode', calculo: true, wolfram: false, symbolab: false, desmos: false },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    handle: '@sarahchen',
    role: 'Lead Engineer at Acme',
    text: 'Calculo replaced three separate math tools for us. The embed API is genius — our users get calculators without leaving our platform.',
  },
  {
    name: 'Marcus Rivera',
    handle: '@marcusdev',
    role: 'Independent Developer',
    text: 'I built a full financial calculator app in an afternoon. The SDK is incredibly well-designed and the docs are clear.',
  },
  {
    name: 'Aiko Tanaka',
    handle: '@aikot',
    role: 'Open Source Contributor',
    text: 'Finally, a calculation platform that\'s truly open source. I can inspect every line, contribute fixes, and self-host if needed.',
  },
];

const faqs = [
  { q: 'How is calculo free?', a: 'Calculo is MIT-licensed open source. You can self-host the entire stack for free. Our cloud service will offer paid tiers for managed hosting, higher rate limits, and priority support — but the core platform remains free.' },
  { q: 'Can I self-host calculo?', a: 'Yes. The entire platform — API server, calculator engine, and web app — can be self-hosted. Deploy with Docker, Vercel, or your own infrastructure.' },
  { q: 'What calculator types are supported?', a: 'Basic, Scientific, Graphing (2D cartesian/parametric/polar), Financial (TVM, amortization), Programming (hex/bin/bitwise), and fully Custom via JSON config.' },
  { q: 'Do I need an API key for the demo?', a: 'No. The interactive demo runs entirely in your browser using the local calculator engine. No server calls, no API keys needed.' },
  { q: 'Can I contribute?', a: 'Absolutely. The project is on GitHub and we welcome issues, PRs, and discussions. Check the CONTRIBUTING guide in the repo.' },
  { q: 'Which languages/frameworks do you support?', a: 'First-class SDKs for TypeScript, React, Vue, Svelte, and Angular. REST API for any language (curl, Python, Go, etc.).' },
];

const blogPosts = [
  {
    category: 'Engineering',
    title: 'Building a calculator engine with 60+ math functions',
    desc: 'How we built a recursive-descent parser, AST evaluator, and function library from scratch in TypeScript.',
    date: 'Jul 7, 2026',
    readTime: '8 min read',
  },
  {
    category: 'Comparisons',
    title: 'Calculo vs Wolfram Alpha: when to self-host',
    desc: 'A feature-by-feature comparison of the two platforms — cost, flexibility, API access, and embed options.',
    date: 'Jul 6, 2026',
    readTime: '6 min read',
  },
  {
    category: 'Guides',
    title: 'Embedding interactive calculators in your product',
    desc: 'Step-by-step guide to adding custom calculators to any website or web app using the calculo embed system.',
    date: 'Jul 5, 2026',
    readTime: '10 min read',
  },
];

const calcTypes = [
  { name: 'Basic', desc: 'Arithmetic, percentages, memory', icon: '+' },
  { name: 'Scientific', desc: 'Trig, log, complex numbers, matrices', icon: '∑' },
  { name: 'Graphing', desc: '2D, parametric, polar plots', icon: 'f(x)' },
  { name: 'Financial', desc: 'TVM, amortization, ROI', icon: '$' },
  { name: 'Programming', desc: 'Hex, bin, bitwise ops', icon: '0x' },
  { name: 'Custom', desc: 'Full JSON control over everything', icon: '⚙' },
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

function AnimatedTerminal() {
  const [line, setLine] = useState(0);
  const lines = [
    { prefix: '$', text: 'npm install @calculo/sdk', delay: 80 },
    { prefix: '>', text: 'added 1 package in 2s', delay: 40 },
    { prefix: '$', text: 'calculo eval "sin(pi/4)^2 + cos(pi/4)^2"', delay: 60 },
    { prefix: '>', text: '→ 1', delay: 30 },
    { prefix: '$', text: 'calculo serve --port 3000', delay: 50 },
    { prefix: '>', text: '→ API running at http://localhost:3000', delay: 30 },
  ];

  useEffect(() => {
    let currentLine = 0;
    let charIndex = 0;
    let currentText = '';
    let timer: ReturnType<typeof setTimeout>;

    function typeLine() {
      if (currentLine >= lines.length) return;
      const l = lines[currentLine];
      if (!l) return;
      if (charIndex < l.text.length) {
        currentText += l.text[charIndex]!;
        charIndex++;
        timer = setTimeout(typeLine, l.delay);
      } else {
        setLine(currentLine + 1);
        currentLine++;
        charIndex = 0;
        currentText = '';
        timer = setTimeout(typeLine, 600);
      }
    }

    timer = setTimeout(typeLine, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed overflow-hidden shadow-2xl">
      {lines.map((l, i) => (
        <div key={i} className={`${i > line ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
          <span className="text-green-400">{l.prefix}</span>{' '}
          <span className={l.prefix === '>' ? 'text-zinc-400' : 'text-zinc-200'}>
            {i < line ? l.text : i === line ? l.text : ''}
          </span>
          {i === line && (
            <span className="inline-block w-2 h-4 bg-zinc-100 ml-0.5 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 pr-4 font-medium text-zinc-300">Feature</th>
            <th className="text-center py-3 px-3 font-bold text-zinc-100">Calculo</th>
            <th className="text-center py-3 px-3 text-zinc-500 font-medium">Wolfram Alpha</th>
            <th className="text-center py-3 px-3 text-zinc-500 font-medium">Symbolab</th>
            <th className="text-center py-3 px-3 text-zinc-500 font-medium">Desmos</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-800/50">
            <td className="py-2 pr-4 text-zinc-400 text-xs">Price</td>
            <td className="text-center py-2 px-3">
              <span className="inline-flex items-center gap-1 text-green-400 font-semibold">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Free
              </span>
            </td>
            <td className="text-center py-2 px-3 text-zinc-500">$5/mo</td>
            <td className="text-center py-2 px-3 text-zinc-500">$7/mo</td>
            <td className="text-center py-2 px-3 text-zinc-500">Free*</td>
          </tr>
          {comparisonRows.map((row) => (
            <tr key={row.feature} className="border-b border-zinc-800/50">
              <td className="py-2.5 pr-4 text-zinc-300">{row.feature}</td>
              {(['calculo', 'wolfram', 'symbolab', 'desmos'] as const).map((col) => (
                <td key={col} className={`text-center py-2.5 px-3 ${row[col] ? 'text-green-400' : 'text-zinc-600'}`}>
                  {row[col] ? (
                    <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  ) : (
                    <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-zinc-600 mt-3">* Desmos is free for basic use; advanced features require subscription.</p>
    </div>
  );
}

function LiveStats() {
  const { data: github } = useQuery({
    queryKey: ['github-stats'],
    queryFn: async () => {
      const res = await fetch('https://api.github.com/repos/thepc101/calculo');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ stargazers_count: number; forks_count: number; open_issues_count: number; }>;
    },
    refetchInterval: 60000,
  });

  const { data: npmDownloads } = useQuery({
    queryKey: ['npm-downloads'],
    queryFn: async () => {
      const res = await fetch('https://api.npmjs.org/downloads/point/last-month/@calculo/sdk');
      if (!res.ok) return { downloads: 0 };
      return res.json() as Promise<{ downloads: number }>;
    },
    refetchInterval: 60000,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center card-hover">
        <div className="text-2xl font-bold mb-1">{github?.stargazers_count ?? '—'}</div>
        <div className="text-xs text-zinc-500 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Stars
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center card-hover">
        <div className="text-2xl font-bold mb-1">{github?.forks_count ?? '—'}</div>
        <div className="text-xs text-zinc-500 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Forks
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center card-hover">
        <div className="text-2xl font-bold mb-1">{npmDownloads?.downloads ?? '—'}</div>
        <div className="text-xs text-zinc-500 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Downloads / mo
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center card-hover">
        <div className="text-2xl font-bold mb-1">{github?.open_issues_count ?? '—'}</div>
        <div className="text-xs text-zinc-500 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          Open Issues
        </div>
      </div>
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-2">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden card-hover"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-medium text-sm">{faq.q}</span>
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                openIndex === i ? 'rotate-180' : ''
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {openIndex === i && (
            <div className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed">{faq.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                The infrastructure for{' '}
                <span className="gradient-text">calculations.</span>
              </h1>
              <p className="mt-4 text-lg text-zinc-400 max-w-xl leading-relaxed">
                Build, embed, and scale calculators with one API.
                From arithmetic to scientific graphing —
                deploy in minutes, serve millions. Free &amp; open source.
              </p>
              <div className="mt-8 flex items-center gap-4 flex-wrap">
                <Link
                  to="/docs"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-7 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Read the docs
                </Link>
                <Link
                  to="/playground"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-7 py-2.5 text-sm font-semibold hover:bg-zinc-800/50 transition-colors"
                >
                  Try the playground
                </Link>
                <a
                  href="https://github.com/thepc101/calculo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <AnimatedTerminal />
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <ComparisonTable />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Live Project Stats</h2>
            <p className="mt-2 text-sm text-zinc-500">Real-time data from GitHub and npm</p>
          </div>
          <LiveStats />
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
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              From the blog
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">Latest posts</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <a
                key={post.title}
                href="/blog"
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 card-hover block"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                    {post.category}
                  </span>
                  <span className="text-xs text-zinc-600">{post.readTime}</span>
                </div>
                <h3 className="font-semibold mb-2 leading-snug">{post.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{post.desc}</p>
                <div className="mt-4 text-xs text-zinc-600">{post.date}</div>
              </a>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/blog"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors inline-flex items-center gap-1"
            >
              View all posts →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              Testimonials
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">Loved by developers</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.handle}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 card-hover"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-300">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-zinc-500">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/50 text-xs text-zinc-400 mb-4">
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">Frequently asked questions</h2>
          </div>
          <FaqSection />
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

import { Link } from '@tanstack/react-router';
import { Calculator } from '../components/calculator';
import { CodeBlock } from '../components/code-block';

const features = [
  { title: 'Embeddable Calculators', description: 'Drop calculators anywhere with a single line of code — React, Vue, iframe, or Web Component.' },
  { title: 'REST API', description: 'Evaluate expressions, render graphs, and manage calculators programmatically.' },
  { title: 'TypeScript SDK', description: 'First-class TypeScript support with full type safety and autocompletion.' },
  { title: 'Graphing Engine', description: '2D, 3D, parametric, polar — render beautiful, interactive graphs at 60fps.' },
  { title: 'Scientific Engine', description: 'Trig, logarithms, complex numbers, matrices, statistics, and more.' },
  { title: 'JSON Configuration', description: 'Every calculator is configurable with a simple JSON object.' },
  { title: 'Analytics', description: 'Track evaluations, errors, performance, and usage patterns.' },
  { title: 'Marketplace', description: 'Publish and discover calculator templates built by the community.' },
];

const codeExamples = {
  typescript: `import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_...');

const result = await calculo.evaluate({
  expression: 'sin(pi/2) + 2^8',
  variables: { x: 42 }
});`,

  react: `import { Calculator } from '@calculo/react';

export function MyApp() {
  return (
    <Calculator
      type="scientific"
      theme="dark"
      graph={true}
      height={600}
    />
  );
}`,

  curl: `curl https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_..." \\
  -H "Content-Type: application/json" \\
  -d '{"expression": "sin(pi/2) + 2^8"}'`,

  embed: `<script src="https://cdn.calculo.dev/widget.js"></script>

<div
  data-calculator="calc_123"
  data-theme="dark"
  data-width="100%"
  data-height="650">
</div>`,
};

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="gradient-text">The infrastructure for calculations.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto">
              Build, embed, and scale calculators with one API.
              From simple arithmetic to complex scientific graphing — 
              deploy in minutes, serve millions.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-8 py-3 text-base font-semibold hover:bg-zinc-200 transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-8 py-3 text-base font-semibold hover:bg-zinc-800/50 transition-colors"
              >
                Documentation
              </Link>
              <a
                href="https://github.com/thepc101/calculo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Try it now</h2>
            <p className="text-zinc-400 mb-8">
              Evaluate expressions instantly. Switch themes. No sign-up required.
            </p>
            <Calculator />
          </div>
          <div className="space-y-4">
            <CodeBlock code={codeExamples.typescript} language="TypeScript" />
            <CodeBlock code={codeExamples.react} language="React" />
            <CodeBlock code={codeExamples.curl} language="curl" />
            <CodeBlock code={codeExamples.embed} language="HTML" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to build with calculations</h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            From embedding to analytics, we provide the complete infrastructure so you can focus on your product.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 card-hover">
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 sm:p-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to build?</h2>
          <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
            Start building with calculo in minutes. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-8 py-3 text-base font-semibold hover:bg-zinc-200 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-8 py-3 text-base font-semibold hover:bg-zinc-800/50 transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

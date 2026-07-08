import { Calculator } from '../components/calculator';
import { CodeBlock } from '../components/code-block';

const examples = [
  {
    title: 'Scientific Calculator',
    description: 'Full scientific calculator with trig, log, and advanced functions.',
    config: {
      type: 'scientific' as const,
      graph: true,
      buttons: ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', '^', '!', 'π'],
    },
  },
  {
    title: 'Mortgage Calculator',
    description: 'Calculate monthly payments with amortization schedule.',
    config: {
      type: 'financial' as const,
      variables: [
        { name: 'principal', value: 300000, description: 'Loan amount', visible: true },
        { name: 'rate', value: 6.5, description: 'Annual interest rate %', visible: true },
        { name: 'years', value: 30, description: 'Loan term in years', visible: true },
      ],
    },
  },
  {
    title: 'Graphing Calculator',
    description: 'Interactive 2D graphing with multiple expressions.',
    config: {
      type: 'graphing' as const,
      graph: true,
      width: '100%',
      height: 500,
    },
  },
  {
    title: 'BMI Calculator',
    description: 'Calculate Body Mass Index from height and weight.',
    config: {
      type: 'basic' as const,
      variables: [
        { name: 'weight', value: 70, description: 'Weight in kg', visible: true },
        { name: 'height', value: 175, description: 'Height in cm', visible: true },
      ],
    },
  },
];

export function ExamplesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Examples</h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Production-quality examples to help you get started quickly.
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
              <div>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Embed Code</h3>
                <CodeBlock
                  code={`<script src="https://cdn.calculo.dev/widget.js"></script>
<div data-calculator="calc_demo" data-theme="dark" data-width="100%" data-height="500">
</div>`}
                  language="html"
                />
              </div>
            </div>
            <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
              <Calculator />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

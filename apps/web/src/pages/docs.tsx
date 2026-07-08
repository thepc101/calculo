import { useState, useMemo, useRef, useEffect } from 'react';

interface DocEntry {
  id: string;
  section: string;
  title: string;
  content: string;
  keywords: string;
}

const allDocs: DocEntry[] = [
  {
    id: 'installation',
    section: 'Getting Started',
    title: 'Installation',
    keywords: 'install npm pnpm yarn setup get started',
    content: `Install the SDK via npm:

\`\`\`bash
npm install @calculo/sdk
\`\`\`

Or using pnpm:

\`\`\`bash
pnpm add @calculo/sdk
\`\`\`

For the React component:

\`\`\`bash
npm install @calculo/react
\`\`\`

For the embed widget, add a script tag:

\`\`\`html
<script src="https://cdn.calculo.dev/widget.js"></script>
\`\`\``,
  },
  {
    id: 'quick-start',
    section: 'Getting Started',
    title: 'Quick Start',
    keywords: 'quick start hello world first expression sdk client',
    content: `Create a client and evaluate your first expression:

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_your_api_key');

const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2',
});
console.log(result); // → 1
\`\`\`

The SDK runs calculations client-side by default with no server call needed. Use the REST API for server-side evaluation.`,
  },
  {
    id: 'authentication',
    section: 'Getting Started',
    title: 'Authentication',
    keywords: 'auth api key token bearer authenticate security',
    content: `All API requests require authentication via a Bearer token:

\`\`\`bash
curl https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"expression": "2+2"}'
\`\`\`

Generate API keys from the Dashboard. Keys support scoped permissions:
- \`evaluate\` — Evaluate expressions
- \`render\` — Generate graph data
- \`calculators\` — Manage calculator configurations
- \`admin\` — Full access`,
  },
  {
    id: 'embedding',
    section: 'Core Concepts',
    title: 'Embedding',
    keywords: 'embed widget html embed code iframe integrate',
    content: `Embed a fully interactive calculator with a single div:

\`\`\`html
<div class="calculo-calculator"
  data-mode="scientific"
  data-theme="dark"
  data-width="400"
  data-height="600"
></div>
<script src="https://cdn.calculo.dev/widget.js"></script>
\`\`\`

**Configuration Options:**

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| \`data-mode\` | string | \`basic\` | Calculator mode: \`basic\`, \`scientific\`, \`graphing\` |
| \`data-theme\` | string | \`dark\` | Theme name: \`dark\`, \`light\`, \`oled\`, \`cyberpunk\`, \`ocean\`, \`forest\`, \`retro\`, \`coffee\`, \`sunset\`, \`aurora\`, \`monochrome\` |
| \`data-width\` | number | \`320\` | Width in pixels |
| \`data-height\` | number | \`520\` | Height in pixels |
| \`data-lock-theme\` | bool | \`false\` | Prevent user from changing theme |
| \`data-lock-size\` | bool | \`false\` | Prevent user from resizing |
| \`data-lock-mode\` | bool | \`false\` | Prevent user from switching mode |

**Locking the interface:**

When embedding calculators in your product, use the \`data-lock-*\` attributes to restrict user changes:

\`\`\`html
<!-- Locked: theme, size, and mode are fixed -->
<div class="calculo-calculator"
  data-mode="scientific"
  data-theme="corporate"
  data-width="400"
  data-height="600"
  data-lock-theme="true"
  data-lock-size="true"
  data-lock-mode="true"
></div>
\`\`\`

This creates a locked-down calculator that matches your brand — users get the full calculation experience without being able to change the appearance or layout.`,
  },
  {
    id: 'themes',
    section: 'Core Concepts',
    title: 'Themes',
    keywords: 'themes theme dark light colors custom branding',
    content: `Calculo ships with 16 built-in themes:

**Dark themes:** \`dark\`, \`oled\`, \`monochrome\`, \`cyberpunk\`, \`ocean\`, \`forest\`, \`sunset\`, \`aurora\`
**Light themes:** \`light\`, \`minimal\`, \`corporate\`, \`retro\`, \`coffee\`
**Special:** \`high-contrast\`, \`glass\`, \`neumorphism\`

Each theme defines:

\`\`\`typescript
interface ThemeConfig {
  mode: string;
  primaryColor: string;   // Accent color for buttons and highlights
  backgroundColor: string; // Background color
  textColor: string;       // Foreground text color
  fontFamily: string;      // Font stack
  borderRadius: number;    // Border radius in px
  spacing: number;         // Grid spacing in px
}
\`\`\`

Use themes via the Theme panel in the interactive demo, or set them in your embed code with \`data-theme="cyberpunk"\`.`,
  },
  {
    id: 'expressions',
    section: 'Core Concepts',
    title: 'Expressions',
    keywords: 'expression evaluate math syntax operators functions',
    content: `Calculo supports a rich expression syntax:

**Arithmetic:** \`+\`, \`-\`, \`*\`, \`/\`, \`^\` (power), \`%\` (modulo)
**Trigonometry:** \`sin()\`, \`cos()\`, \`tan()\`, \`asin()\`, \`acos()\`, \`atan()\`
**Hyperbolic:** \`sinh()\`, \`cosh()\`, \`tanh()\`
**Logarithms:** \`log()\` (base 10), \`ln()\` (natural), \`log2()\`
**Numeric:** \`abs()\`, \`floor()\`, \`ceil()\`, \`round()\`, \`sqrt()\`, \`cbrt()\`, \`exp()\`
**Statistics:** \`min()\`, \`max()\`, \`mean()\`, \`median()\`, \`stddev()\`, \`variance()\`
**Combinatorics:** \`nPr()\`, \`nCr()\`, \`factorial()\`
**Constants:** \`pi\` (π), \`e\`, \`phi\`, \`c\`, \`h\`, \`G\`, \`R\`

**Angle modes:** Use \`DEG\`, \`RAD\`, or \`GRAD\` for trigonometric functions.`,
  },
  {
    id: 'calculator-types',
    section: 'Core Concepts',
    title: 'Calculator Types',
    keywords: 'basic scientific graphing financial programming custom calculator type',
    content: `Six calculator types are available, each with a pre-built layout:

**Basic** — Arithmetic operations, percentages, memory functions (M+, M-, MR, MC). Perfect for simple calculations.

**Scientific** — Trigonometric, logarithmic, exponential functions. Shift key for inverse functions. Constants library. Angle mode (DEG/RAD/GRAD). Powers and roots. Factorials, permutations, combinations.

**Graphing** — Plot cartesian, parametric, and polar functions. Adjustable window bounds. Trace and zoom features.

**Financial** — TVM (Time Value of Money), amortization schedules, ROI calculations, payment formulas.

**Programming** — Hexadecimal, binary, octal conversion. Bitwise operators (AND, OR, XOR, NOT, shift).

**Custom** — Full JSON control over every button, layout, and behavior. Define your own variables, functions, and display settings.`,
  },
  {
    id: 'scientific-mode',
    section: 'Guides',
    title: 'Scientific Mode',
    keywords: 'scientific mode trig log functions shift alpha constants',
    content: `The scientific calculator includes:

**Shift Key** — Tap to access inverse functions (\`sin⁻¹\`, \`cos⁻¹\`, \`tan⁻¹\`), powers (\`x²\`, \`x³\`, \`ʸ√x\`), and alternate forms (\`10ˣ\`, \`eˣ\`, \`∛\`).

**Alpha Key** — Tap to insert variable names (A-F, M, X, Y, Z) into expressions.

**Angle Mode** — Toggle between DEG (degrees), RAD (radians), and GRAD (gradians) using the MODE button or β (beta shift).

**Memory Operations:**
- \`M+\` — Add current result to memory
- \`M-\` — Subtract current result from memory
- \`MR\` — Recall memory value into expression
- \`MC\` — Clear memory

The \`M\` indicator appears in the status bar when memory contains a value. The \`S\` and \`A\` indicators show when Shift or Alpha are active.`,
  },
  {
    id: 'graphing',
    section: 'Guides',
    title: 'Graphing',
    keywords: 'graph plot function cartesian parametric polar',
    content: `The graphing calculator lets you plot multiple functions simultaneously.

**Functions:** Enter expressions using \`y=\` notation. Use \`x\` as the independent variable.

\`\`\`typescript
const graphData = await calculo.render({
  expressions: [
    { expression: 'sin(x)', color: '#3b82f6' },
    { expression: 'cos(x)', color: '#10b981' },
  ],
  bounds: { xMin: -10, xMax: 10, yMin: -2, yMax: 2 },
});
\`\`\`

**Graph types:** Cartesian (\`y=f(x)\`), Parametric (\`x=f(t), y=g(t)\`), Polar (\`r=f(θ)\`).

**Controls:** WINDOW → Adjust viewport bounds. ZOOM → Zoom in/out. TRACE → Follow curve with cursor. GRAPH → Render all active plots.`,
  },
  {
    id: 'custom-buttons',
    section: 'Guides',
    title: 'Custom Buttons',
    keywords: 'custom buttons layout json configure override',
    content: `Override every button in the calculator via JSON config:

\`\`\`typescript
const calculator = new Calculo('cal_key');
await calculator.createCalculator({
  type: 'custom',
  buttons: [
    {
      id: 'my-btn',
      label: 'GDP',
      value: 'gdp(2024)',
      type: 'custom',
      position: { row: 0, col: 0, width: 2 },
    },
  ],
});
\`\`\`

Each button supports: \`id\`, \`label\`, \`value\`, \`type\`, \`size\`, \`shape\`, \`color\`, \`icon\`, \`position\`, \`action\`.

Button types: \`number\`, \`operator\`, \`function\`, \`memory\`, \`action\`, \`custom\`.

Sizes: \`sm\`, \`md\`, \`lg\`, \`xl\`. Shapes: \`square\`, \`rounded\`, \`pill\`, \`circle\`.`,
  },
  {
    id: 'react-sdk',
    section: 'SDKs & Libraries',
    title: 'React SDK',
    keywords: 'react hook component sdk calculator',
    content: `The React SDK provides first-class components with full type safety:

\`\`\`typescript
import { Calculator, useCalculo } from '@calculo/react';

export function Demo() {
  const { evaluate } = useCalculo('cal_key');

  return (
    <Calculator
      type="scientific"
      variables={[
        { name: 'x', value: 42 },
      ]}
      theme={{
        mode: 'dark',
        primaryColor: '#10b981',
      }}
      graph={true}
    />
  );
}
\`\`\`

Props match the CalculatorConfig interface. Use \`useCalculo()\` hook for direct expression evaluation.`,
  },
  {
    id: 'embed-locking',
    section: 'Guides',
    title: 'Embed Locking & Configuration',
    keywords: 'lock freeze restrict embed config export settings',
    content: `When embedding calculators in your product, you can lock various aspects of the interface to match your design requirements.

**Lock Attributes:**

| Attribute | Effect |
|-----------|--------|
| \`data-lock-theme="true"\` | Hides the Theme button, prevents theme switching |
| \`data-lock-size="true"\` | Hides size presets and resize handle, fixes dimensions |
| \`data-lock-mode="true"\` | Disables mode switching (Basic/Scientific/Graphing) |

**Full Lock Example:**

\`\`\`html
<div class="calculo-calculator"
  data-mode="scientific"
  data-theme="corporate"
  data-width="400"
  data-height="600"
  data-lock-theme="true"
  data-lock-size="true"
  data-lock-mode="true"
></div>
<script src="https://cdn.calculo.dev/widget.js"></script>
\`\`\`

**Exporting Configuration:**

Use the Config panel in the interactive calculator demo to export the current calculator state as JSON. This includes mode, theme, dimensions, and lock settings — perfect for reproducing the exact setup in your application.

The exported JSON follows the \`CalculatorConfig\` interface:

\`\`\`json
{
  "mode": "scientific",
  "theme": "dark",
  "width": 400,
  "height": 600,
  "lockTheme": true,
  "lockSize": true,
  "lockMode": false
}
\`\`\`

**Programmatic Configuration:**

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const config = {
  type: 'scientific' as const,
  theme: { mode: 'dark', primaryColor: '#6366f1' },
  width: 400,
  height: 600,
  history: true,
  memory: true,
  precision: 12,
  angleMode: 'rad' as const,
};

const calc = await calculo.createCalculator(config);
console.log(calc.id); // "calc_abc123"
\`\`\`

This saves the configuration server-side and generates a unique ID. Use this ID in your embed code to load the exact same calculator anywhere.`,
  },
  {
    id: 'api-reference',
    section: 'Platform',
    title: 'API Reference',
    keywords: 'api rest endpoints evaluate render calculators reference',
    content: `**POST** \`/v1/evaluate\`

Evaluate a mathematical expression.

\`\`\`json
{
  "expression": "sin(pi/2) + 2^8",
  "variables": { "x": 42 },
  "precision": 12,
  "angleMode": "rad"
}
\`\`\`

**POST** \`/v1/render\`

Generate graph data from mathematical expressions.

\`\`\`json
{
  "expressions": [
    { "expression": "sin(x)", "color": "#3b82f6" },
    { "expression": "cos(x)", "color": "#10b981" }
  ],
  "bounds": { "xMin": -10, "xMax": 10, "yMin": -2, "yMax": 2 }
}
\`\`\`

**POST** \`/v1/calculators\`

Create a new calculator configuration.

\`\`\`json
{
  "type": "scientific",
  "theme": { "mode": "dark" },
  "precision": 12,
  "graph": true,
  "history": true
}
\`\`\`

**GET** \`/v1/calculators/:id\`

Retrieve a saved calculator configuration.

**DELETE** \`/v1/calculators/:id\`

Delete a calculator configuration.

**GET** \`/v1/analytics\`

Get usage analytics (requires admin key).

**GET** \`/v1/usage\`

Get usage statistics for your project.`,
  },
];

const sections = Array.from(new Set(allDocs.map(d => d.section)));

export function DocsPage() {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('installation');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return allDocs;
    const q = query.toLowerCase();
    return allDocs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.keywords.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q)
    );
  }, [query]);

  const activeDoc = useMemo(() => {
    return filtered.find(d => d.id === activeId) ?? filtered[0];
  }, [filtered, activeId]);

  useEffect(() => {
    if (activeDoc && filtered.find(d => d.id === activeId) === undefined) {
      setActiveId(filtered[0]?.id ?? '');
    }
  }, [filtered, activeId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-[280px_1fr] gap-12">
        <aside className="space-y-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search docs..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded hidden sm:inline">
              ⌘K
            </kbd>
          </div>

          {filtered.length === 0 && (
            <div className="text-sm text-zinc-500 text-center py-8">
              No results for "{query}"
            </div>
          )}

          {sections.map(section => {
            const items = filtered.filter(d => d.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {section}
                </h3>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveId(item.id)}
                        className={`text-sm w-full text-left px-3 py-1.5 rounded-lg transition-colors ${
                          activeId === item.id
                            ? 'bg-zinc-800 text-zinc-100 font-medium'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>

        <div className="min-w-0">
          {activeDoc && (
            <article>
              <h1 className="text-3xl font-bold mb-2">{activeDoc.title}</h1>
              <span className="text-xs text-zinc-600 uppercase tracking-wider">{activeDoc.section}</span>
              <div className="mt-8 prose prose-invert max-w-none">
                <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-sm font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {activeDoc.content}
                </pre>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

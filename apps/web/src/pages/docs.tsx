import { useState, useMemo, useRef, useEffect } from 'react';
import { Markdown } from '../lib/markdown';

interface DocPage {
  id: string;
  section: string;
  title: string;
  content: string;
  keywords: string;
}

const pages: DocPage[] = [
  {
    id: 'overview',
    section: 'Getting Started',
    title: 'Overview',
    keywords: 'overview introduction what is calculo infrastructure',
    content: `# Overview

calculo is the infrastructure layer for calculations.

Build, embed, and scale calculators with one API. From simple arithmetic to complex scientific calculations — deploy in minutes, serve millions.

## Key Features

- **Calculator API** — Evaluate expressions, render graphs, manage configurations
- **Embed Widgets** — Drop interactive calculators into any website with a single div
- **SDKs** — First-class TypeScript, React, Vue, Angular, and Svelte SDKs
- **16 Themes** — Dark, light, cyberpunk, ocean, and 12 more premium themes
- **Locking** — Lock theme, size, and mode when embedding in your product
- **Self-hostable** — MIT-licensed, deploy on your own infrastructure
- **Graph Engine** — Cartesian, parametric, and polar graphing
- **60+ Functions** — Trig, hyperbolic, log, stats, combinatorics, constants

## Quick Example

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_live_key');

const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2'
});
// → { result: 1 }
\`\`\`

The SDK evaluates expressions client-side by default — no server call needed. Use the REST API for server-side evaluation.
`,
  },
  {
    id: 'installation',
    section: 'Getting Started',
    title: 'Installation',
    keywords: 'install npm pnpm yarn setup sdk',
    content: `# Installation

## npm

\`\`\`bash
npm install @calculo/sdk
\`\`\`

## pnpm

\`\`\`bash
pnpm add @calculo/sdk
\`\`\`

## React

\`\`\`bash
npm install @calculo/react
\`\`\`

## Embed Widget

Add the script to your HTML:

\`\`\`html
<script src="https://cdn.calculo.dev/widget.js"></script>
\`\`\`

> **Note**: The embed widget is the simplest way to add a calculator to any website. No build step required.

## Requirements

- Node.js >= 18
- TypeScript >= 5.0 (optional, for typed SDK)
`,
  },
  {
    id: 'authentication',
    section: 'Getting Started',
    title: 'Authentication',
    keywords: 'auth api key token bearer authenticate signup key',
    content: `# Authentication

Every API request requires a Bearer token.

## Getting Your API Key

When you sign up for calculo, an API key is automatically generated for your account. Find it in your Dashboard under **API Keys**.

## Using Your API Key

Add the key to all API requests:

\`\`\`bash
curl https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"expression": "2+2"}'
\`\`\`

## SDK Usage

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const calculo = new Calculo(process.env.CALCULO_API_KEY);
\`\`\`

## Key Security

- Never expose your API key in client-side code
- Use environment variables for production
- Rotate keys regularly from the Dashboard
- Each account gets one key on signup; generate additional keys as needed`,
  },
  {
    id: 'calculator-types',
    section: 'Calculators',
    title: 'Calculator Types',
    keywords: 'basic scientific custom types modes',
    content: `# Calculator Types

Calculo supports six calculator types, each with a purpose-built layout and feature set.

## Basic

Arithmetic, memory operations (M+, M-, MR, MC), parentheses, negation, percentage. Ideal for simple calculations and e-commerce price calculators.

## Scientific

Full scientific mode with:
- **Trigonometry**: sin, cos, tan + inverse functions
- **Logarithms**: log (base 10), ln (natural log)
- **Powers & Roots**: x², √, xʸ
- **Angle modes**: DEG, RAD, GRAD toggling
- **Memory**: M+, M-, MR, MC with status indicator
- **Secondary functions**: 2nd key for inverse trig, 10ˣ, eˣ

## Graphing

Interactive 2D graphing with:
- SVG-rendered curves with configurable colors
- Up to 6 simultaneous function plots
- Axis labels, grid lines, tick marks
- Real-time update on expression change
- Window bounds: x: [-10, 10], y: [-10, 10]

## Financial

TVM (Time Value of Money), amortization, ROI, payment calculations.

## Programming

Hexadecimal, binary, octal conversion. Bitwise operators (AND, OR, XOR, NOT, shift).

## Custom

Full JSON control over every button, layout, and behavior. Define your own variables, functions, and display settings.

> **Pro tip**: Use the interactive demo to configure your calculator, then export the Config JSON.`,
  },
  {
    id: 'expressions',
    section: 'Calculators',
    title: 'Expressions & Functions',
    keywords: 'expression evaluate math syntax operators functions constants',
    content: `# Expressions & Functions

## Arithmetic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| \`+\` | Addition | \`2 + 3\` |
| \`-\` | Subtraction | \`5 - 2\` |
| \`*\` | Multiplication | \`4 * 3\` |
| \`/\` | Division | \`10 / 2\` |
| \`^\` | Power | \`2 ^ 10\` |
| \`%\` | Modulo | \`7 % 3\` |
| \`!\` | Factorial | \`5!\` |

## Trigonometric Functions

| Function | Description |
|----------|-------------|
| \`sin(x)\` | Sine (respects angle mode) |
| \`cos(x)\` | Cosine |
| \`tan(x)\` | Tangent |
| \`asin(x)\` | Arcsine (result in radians) |
| \`acos(x)\` | Arccosine |
| \`atan(x)\` | Arctangent |
| \`sinh(x)\` | Hyperbolic sine |
| \`cosh(x)\` | Hyperbolic cosine |
| \`tanh(x)\` | Hyperbolic tangent |

## Logarithmic Functions

| Function | Description |
|----------|-------------|
| \`log(x)\` | Base-10 logarithm |
| \`ln(x)\` | Natural logarithm |
| \`log2(x)\` | Base-2 logarithm |

## Other Functions

| Function | Description |
|----------|-------------|
| \`sqrt(x)\` | Square root |
| \`cbrt(x)\` | Cube root |
| \`abs(x)\` | Absolute value |
| \`floor(x)\` | Round down |
| \`ceil(x)\` | Round up |
| \`round(x)\` | Round to nearest |
| \`exp(x)\` | e^x |
| \`min(a, b, ...)\` | Minimum |
| \`max(a, b, ...)\` | Maximum |
| \`rand()\` | Random number [0, 1) |
| \`randint(a, b)\` | Random integer [a, b] |
| \`gcd(a, b)\` | Greatest common divisor |
| \`lcm(a, b)\` | Least common multiple |

## Constants

| Constant | Value |
|----------|-------|
| \`pi\` | 3.14159... |
| \`e\` | 2.71828... |
| \`phi\` | 1.61803... |
| \`c\` | 299,792,458 (speed of light) |
| \`h\` | 6.626e-34 (Planck) |
| \`G\` | 6.674e-11 (gravitational) |
| \`R\` | 8.314 (gas constant) |

## Angle Modes

- **DEG** — Degrees (360° = full circle)
- **RAD** — Radians (2π = full circle)
- **GRAD** — Gradians (400 grad = full circle)

Toggle with the MODE button in scientific mode. Default is DEG.`,
  },
  {
    id: 'embedding',
    section: 'Embedding',
    title: 'Embedding Calculators',
    keywords: 'embed widget html iframe integrate website',
    content: `# Embedding Calculators

Embed a fully interactive calculator into any website with a single HTML element.

## Basic Embed

\`\`\`html
<div class="calculo-calculator"
  data-mode="scientific"
  data-theme="dark"
  data-width="340"
  data-height="500"
></div>
<script src="https://cdn.calculo.dev/widget.js"></script>
\`\`\`

## Configuration Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| \`data-mode\` | string | \`basic\` | Calculator mode: \`basic\`, \`scientific\` |
| \`data-theme\` | string | \`dark\` | Theme name. See [Themes](#themes) for all options |
| \`data-width\` | number | \`340\` | Width in pixels |
| \`data-height\` | number | \`500\` | Height in pixels |
| \`data-lock-theme\` | bool | \`false\` | Disable theme switching |
| \`data-lock-size\` | bool | \`false\` | Disable resizing |
| \`data-lock-mode\` | bool | \`false\` | Disable mode switching |

## Locking the Interface

When embedding in your product, use lock attributes to create a branded, fixed calculator:

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

Locked calculators hide the Theme button, size controls, and mode switcher — users get the full calculation experience without being able to change the appearance.

## React Embed

\`\`\`tsx
import { Calculator } from '@calculo/react';

export function Demo() {
  return (
    <Calculator
      type="scientific"
      theme={{ mode: 'dark' }}
      graph={true}
    />
  );
}
\`\`\`

## Embed Best Practices

- Lock theme and size for production embeds to maintain brand consistency
- Use \`scientific\` mode for advanced calculations, \`basic\` for simple arithmetic
- Set explicit width and height to prevent layout shift
- Always include the widget.js script immediately after the calculator element`,
  },
  {
    id: 'themes',
    section: 'Embedding',
    title: 'Themes',
    keywords: 'themes theme dark light colors customize branding',
    content: `# Themes

Calculo ships with 16 built-in themes, each defining a complete color palette and typography.

## All Themes

| Theme | Type | Primary | Background | Best For |
|-------|------|---------|------------|----------|
| \`dark\` | Dark | Blue | Dark charcoal | Default, general use |
| \`light\` | Light | Blue | White | Light-mode sites |
| \`oled\` | Dark | Indigo | Pure black | OLED displays, dark mode |
| \`high-contrast\` | Dark | Yellow | Black | Accessibility |
| \`glass\` | Dark | Purple | Translucent | Modern UI overlays |
| \`neumorphism\` | Light | Indigo | Light gray | Soft UI design |
| \`minimal\` | Light | Black | White | Clean, monochrome |
| \`corporate\` | Light | Navy | Slate | Business applications |
| \`cyberpunk\` | Dark | Magenta | Deep navy | Gaming, tech |
| \`retro\` | Light | Orange | Warm cream | Vintage feel |
| \`coffee\` | Dark | Brown | Espresso | Warm, cozy |
| \`ocean\` | Dark | Cyan | Deep blue | Calm, professional |
| \`forest\` | Dark | Green | Forest | Nature-inspired |
| \`sunset\` | Dark | Orange | Dark purple | Warm, dramatic |
| \`aurora\` | Dark | Green | Dark navy | Modern, tech |
| \`monochrome\` | Dark | Gray | Dark gray | Minimal, neutral |

## Using Themes

In embed HTML:

\`\`\`html
<div class="calculo-calculator"
  data-theme="cyberpunk"
></div>
\`\`\`

In the SDK:

\`\`\`typescript
import { themes } from '@calculo/config';

const calculator = new Calculo('key');
await calculator.createCalculator({
  type: 'scientific',
  theme: themes.ocean,
});
\`\`\`

## Custom Themes

Each theme is defined by a \`ThemeConfig\` object:

\`\`\`typescript
interface ThemeConfig {
  mode: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: number;
  spacing: number;
}
\`\`\`

Override any value when creating a calculator:

\`\`\`typescript
const config = {
  type: 'scientific',
  theme: {
    mode: 'custom',
    primaryColor: '#10b981',
    backgroundColor: '#0a0a0b',
    textColor: '#fafafa',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 12,
    spacing: 6,
  },
};
\`\`\``,
  },
  {
    id: 'graphing',
    section: 'Guides',
    title: 'Graphing Guide',
    keywords: 'graph plot function cartesian parametric polar svg',
    content: `# Graphing Guide

The graphing calculator renders 2D function plots as SVG directly in the browser.

## Getting Started

Switch to **Graphing** mode. Enter an expression using \`x\` as the variable. Press = to plot.

### Example Functions

| Expression | Description |
|------------|-------------|
| \`sin(x)\` | Sine wave |
| \`cos(x)\` | Cosine wave |
| \`x^2\` | Parabola |
| \`sqrt(x)\` | Square root curve |
| \`tan(x)\` | Tangent |
| \`e^(-x^2)\` | Bell curve |
| \`sin(x) + cos(x)\` | Combined wave |
| \`x^3 - 3*x\` | Cubic |

## Multiple Functions

Add up to 6 functions simultaneously. Each function gets a unique color. Toggle colors using the color picker.

## Graph Display

- **Grid**: Axis lines with tick marks every 1 unit
- **Range**: x: [-10, 10], y: [-10, 10]
- **Resolution**: 400 sample points per function
- **SVG rendering**: Crisp, scalable, theme-aware

## API Graphing

\`\`\`typescript
const graphData = await calculo.render({
  expressions: [
    { expression: 'sin(x)', color: '#3b82f6' },
    { expression: 'cos(x)', color: '#10b981' },
  ],
  bounds: { xMin: -10, xMax: 10, yMin: -2, yMax: 2 },
});
\`\`\`

> **Note**: The graph renders in the calculator display area. Resize the calculator for a larger graph view.
`,
  },
  {
    id: 'scientific-mode',
    section: 'Guides',
    title: 'Scientific Mode Guide',
    keywords: 'scientific mode trig log shift second alpha constants memory',
    content: `# Scientific Mode Guide

The scientific calculator provides professional-grade mathematical functions.

## Key Features

### 2nd (Shift) Key

Tap the **2nd** button to access secondary functions. The green "2nd" indicator appears when active.

| Button | Normal | Shifted |
|--------|--------|---------|
| sin | \`sin(\` | \`asin(\` |
| cos | \`cos(\` | \`acos(\` |
| tan | \`tan(\` | \`atan(\` |
| log | \`log(\` | \`10**(\` |
| ln | \`ln(\` | \`e**(\` |

### Angle Mode

Tap **DEG** to cycle between DEG → RAD → GRAD. The current mode displays in the status bar.

### Memory Operations

| Button | Action |
|--------|--------|
| M+ | Add current result to memory |
| M- | Subtract current result from memory |
| MR | Recall memory into expression |
| MC | Clear memory |

The **M** indicator appears when memory contains a value.

### Constants

Use \`π\` (pi) and the expression \`e\` for Euler's number.

## Example Expressions

\`\`\`
sin(45)        → 0.7071 (in DEG mode)
cos(pi)        → -1
log(100)       → 2
ln(e^2)        → 2
2^10           → 1024
sqrt(144)      → 12
5!             → 120
π              → 3.14159...
\`\`\`

> **Pro tip**: Use the ALPHA key to insert variable names (A-Z) for reusable calculations.
`,
  },
  {
    id: 'react-sdk',
    section: 'SDKs',
    title: 'React SDK',
    keywords: 'react hook component sdk usecalculo',
    content: `# React SDK

First-class React components with full type safety.

## Installation

\`\`\`bash
npm install @calculo/react
\`\`\`

## Calculator Component

\`\`\`tsx
import { Calculator } from '@calculo/react';

export function Demo() {
  return (
    <Calculator
      type="scientific"
      theme={{ mode: 'dark', primaryColor: '#10b981' }}
      graph={true}
    />
  );
}
\`\`\`

## useCalculo Hook

\`\`\`tsx
import { useCalculo } from '@calculo/react';

function EvalDemo() {
  const { evaluate, result, error } = useCalculo();

  const handleClick = async () => {
    await evaluate({ expression: 'sin(pi/2)' });
  };

  return (
    <div>
      <button onClick={handleClick}>Evaluate</button>
      {result && <p>Result: {result}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`type\` | string | \`basic\` | Calculator type |
| \`theme\` | object | \`dark\` | Theme configuration |
| \`graph\` | bool | \`false\` | Enable graphing |
| \`history\` | bool | \`true\` | Enable history |
| \`variables\` | array | \`[]\` | Variable definitions |
| \`precision\` | number | \`12\` | Decimal precision |

## TypeScript

All components are fully typed. Import types from \`@calculo/shared\`:

\`\`\`typescript
import type { CalculatorConfig, ThemeConfig } from '@calculo/shared';
\`\`\``,
  },
  {
    id: 'api-reference',
    section: 'API',
    title: 'API Reference',
    keywords: 'api rest endpoints evaluate render calculators reference',
    content: `# API Reference

All API endpoints require authentication via Bearer token. Base URL: \`https://api.calculo.dev\`

## Evaluate

**POST** \`/v1/evaluate\`

Evaluate a mathematical expression.

\`\`\`bash
curl https://api.calculo.dev/v1/evaluate \\
  -H "Authorization: Bearer cal_live_key" \\
  -H "Content-Type: application/json" \\
  -d '{"expression": "sin(pi/2) + 2^8"}'
\`\`\`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`expression\` | string | yes | Mathematical expression |
| \`variables\` | object | no | Variable values |
| \`precision\` | number | no | Decimal precision (default: 12) |
| \`angleMode\` | string | no | deg, rad, or grad (default: rad) |

**Response:**

\`\`\`json
{
  "result": 256.5,
  "error": null
}
\`\`\`

## Render Graph

**POST** \`/v1/render\`

Generate graph data from mathematical expressions.

\`\`\`bash
curl https://api.calculo.dev/v1/render \\
  -H "Authorization: Bearer cal_live_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "expressions": [
      {"expression": "sin(x)", "color": "#3b82f6"}
    ],
    "bounds": {"xMin": -10, "xMax": 10, "yMin": -2, "yMax": 2}
  }'
\`\`\`

## Create Calculator

**POST** \`/v1/calculators\`

Save a calculator configuration.

\`\`\`bash
curl https://api.calculo.dev/v1/calculators \\
  -H "Authorization: Bearer cal_live_key" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "scientific", "theme": {"mode": "dark"}}'
\`\`\`

## Get Calculator

**GET** \`/v1/calculators/:id\`

Retrieve a saved calculator configuration.

## Delete Calculator

**DELETE** \`/v1/calculators/:id\`

Delete a calculator configuration.

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| \`PARSE_ERROR\` | 400 | Expression could not be parsed |
| \`EVALUATION_ERROR\` | 400 | Error during evaluation |
| \`VALIDATION_ERROR\` | 422 | Invalid request body |
| \`UNAUTHORIZED\` | 401 | Invalid or missing API key |
| \`RATE_LIMIT\` | 429 | Rate limit exceeded |

## Rate Limits

| Plan | Evaluations/month |
|------|------------------|
| Free | 1,000 |
| Beginner | 10,000 |
| Pro | 100,000 |

Rate limits reset monthly.`,
  },
  {
    id: 'embed-locking',
    section: 'Guides',
    title: 'Embed Locking & Configuration',
    keywords: 'lock freeze restrict embed config export settings customization',
    content: `# Embed Locking & Configuration

When embedding calculators in your product, you can lock various aspects to maintain brand consistency and UX control.

## Lock Attributes

Use HTML data attributes to restrict user changes:

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

### What Each Lock Does

| Attribute | Effect |
|-----------|--------|
| \`data-lock-theme="true"\` | Hides the Theme button entirely |
| \`data-lock-size="true"\` | Removes the resize handle, fixes dimensions |
| \`data-lock-mode="true"\` | Disables mode switching |

## Config Export

Use the **Config** panel in the interactive demo to export the current calculator state as JSON:

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

## Programmatic Configuration

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const config = {
  type: 'scientific' as const,
  theme: { mode: 'dark', primaryColor: '#6366f1' },
  width: 400,
  height: 600,
  history: true,
  precision: 12,
  angleMode: 'rad' as const,
};

const calc = await calculo.createCalculator(config);
console.log(calc.id); // "calc_abc123"
\`\`\`

This saves the configuration server-side and generates a unique calculator ID.

> **Best Practice**: Lock theme and size in production embeds. Let users interact with the calculator, not the configuration.
`,
  },
  {
    id: 'sdk-integration',
    section: 'SDKs',
    title: 'SDK Integration',
    keywords: 'sdk typescript javascript integration programmatic',
    content: `# SDK Integration

## TypeScript / JavaScript SDK

\`\`\`bash
npm install @calculo/sdk
\`\`\`

### Basic Usage

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_live_key');

// Evaluate an expression
const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2'
});

// Render a graph
const graph = await calculo.render({
  expressions: [
    { expression: 'sin(x)', color: '#3b82f6' }
  ]
});

// Create a calculator config
const calc = await calculo.createCalculator({
  type: 'scientific',
  theme: { mode: 'ocean' }
});
\`\`\`

### Client-Side Evaluation

The SDK uses the local calculator engine by default. No network requests are made for evaluation — perfect for interactive demos and offline-capable applications.

### Server-Side Evaluation

Use the REST API for server-side evaluation with the same SDK:

\`\`\`typescript
const result = await calculo.api.evaluate({
  expression: '2^100',
  precision: 50,
});
\`\`\`

## Framework SDKs

| SDK | Package | Status |
|-----|---------|--------|
| React | \`@calculo/react\` | ✅ Available |
| Vue | \`@calculo/vue\` | ✅ Available |
| Angular | \`@calculo/angular\` | ✅ Available |
| Svelte | \`@calculo/svelte\` | ✅ Available |
| Web Component | \`@calculo/embed\` | ✅ Available |
| Python | \`calculo-sdk-python\` | 🔜 Coming soon |
| Go | \`calculo-sdk-go\` | 🔜 Coming soon |
| curl | REST API | ✅ Available |
`,
  },
];

const sections = Array.from(new Set(pages.map(d => d.section)));

export function DocsPage() {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('overview');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return pages;
    const q = query.toLowerCase();
    return pages.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.keywords.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q)
    );
  }, [query]);

  const activeDoc = useMemo(() => {
    return filtered.find(d => d.id === activeId) ?? filtered[0];
  }, [filtered, activeId]);

  useEffect(() => {
    if (filtered.find(d => d.id === activeId) === undefined) {
      setActiveId(filtered[0]?.id ?? '');
    }
  }, [filtered, activeId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_200px] gap-12">
        <aside className="space-y-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search docs..."
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded hidden sm:inline">⌘K</kbd>
          </div>

          {filtered.length === 0 && <div className="text-sm text-zinc-500 text-center py-8">No results for "{query}"</div>}

          {sections.map(section => {
            const items = filtered.filter(d => d.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{section}</h3>
                <ul className="space-y-1">
                  {items.map(item => (
                    <li key={item.id}>
                      <button onClick={() => setActiveId(item.id)}
                        className={`text-sm w-full text-left px-3 py-1.5 rounded-lg transition-colors ${
                          activeId === item.id ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                      >{item.title}</button>
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
              <div className="max-w-none">
                <Markdown content={activeDoc.content} />
              </div>
              <div className="mt-16 pt-8 border-t border-zinc-800 flex items-center justify-between text-sm">
                <span className="text-zinc-600">Section: {activeDoc.section}</span>
                <a href={`https://github.com/thepc101/calculo/edit/main/apps/web/src/pages/docs.tsx`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit this page
                </a>
              </div>
            </article>
          )}
        </div>

        {activeDoc && (
          <aside className="hidden xl:block space-y-3">
            <h4 className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">On this page</h4>
            <div className="space-y-1.5 text-sm text-zinc-500">
              {activeDoc.content.split('\n').filter(l => l.startsWith('## ')).map((l, i) => {
                const title = l.replace(/^##\s+/, '');
                return (
                  <button key={i} onClick={() => {
                    const el = document.getElementById(title.toLowerCase().replace(/\s+/g, '-'));
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }} className="block hover:text-zinc-300 transition-colors w-full text-left"
                  >{title}</button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

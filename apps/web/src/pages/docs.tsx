import { useState, useMemo, useRef, useEffect } from 'react';
import { Markdown } from '../lib/markdown';

interface DocPage {
  id: string;
  section: string;
  title: string;
  content: string;
  keywords: string;
}

const SITE = 'https://calculo-fawn.vercel.app';

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

- **Embed Widgets** — Drop interactive calculators into any website with a single div
- **Evaluate API** — Evaluate math expressions via REST (no auth required)
- **SDKs** — First-class TypeScript, React, Vue, Angular, and Svelte SDKs
- **16 Themes** — Dark, light, cyberpunk, ocean, and 12 more premium themes
- **Locking** — Lock theme, size, and mode when embedding in your product
- **Self-hostable** — MIT-licensed, deploy on your own infrastructure
- **Graph Panel** — Toggle interactive graphing inside any calculator
- **60+ Functions** — Trig, hyperbolic, log, stats, combinatorics, constants

## Quick Start — Embed

\`\`\`html
<script>window.CALCULO_API_KEY = 'demo';</script>
<script src="${SITE}/embed.js"></script>
<div data-calculator="demo_basic"></div>
\`\`\`

## Quick Start — Evaluate API

\`\`\`bash
curl "${SITE}/api/embed/evaluate?expr=2%2B2&angle=deg"
# → {"result":4,"expression":"2+2","angle":"deg"}
\`\`\`

## Quick Start — SDK

\`\`\`bash
npm install @calculo/sdk
\`\`\`

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const calculo = new Calculo();
const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2'
});
// → { result: 1 }
\`\`\`

The SDK evaluates expressions client-side by default — no API key needed. Use the REST API for server-side evaluation (also no key required).
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

Add the script and a div to your HTML:

\`\`\`html
<script>window.CALCULO_API_KEY = 'demo';</script>
<script src="${SITE}/embed.js"></script>
<div data-calculator="demo_basic"></div>
\`\`\`

> **Note**: The embed widget is the simplest way to add a calculator to any website. No build step required. Set \`CALCULO_API_KEY\` to \`'demo'\` for demo configs, or your \`calc_live_*\` key for custom calculators.

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

## API Keys (for creating/managing calculators)

Sign up at [${SITE}/signup](${SITE}/signup) to get an API key. Find it in your Dashboard under **API Keys**.

API keys are used to create and manage calculators via the API. They are \`calc_live_*\` format.

## Evaluate API (no auth needed)

The evaluate endpoint at \`/api/embed/evaluate\` does NOT require authentication — it's open for anyone to use.

\`\`\`bash
curl "${SITE}/api/embed/evaluate?expr=2%5E10&angle=deg"
\`\`\`

## SDK (no auth needed for evaluation)

\`\`\`typescript
import { Calculo } from '@calculo/sdk';
const calculo = new Calculo(); // no key needed for client-side eval
\`\`\`

## Key Security

- Never expose your API key in client-side code
- Use environment variables for production
- Rotate keys regularly from the Dashboard`,
  },
  {
    id: 'calculator-types',
    section: 'Calculators',
    title: 'Calculator Types',
    keywords: 'basic scientific custom types modes',
    content: `# Calculator Types

Calculo supports two calculator modes, plus a graphing panel.

## Basic

Arithmetic, memory operations (M+, M-, MR, MC), parentheses, negation. Ideal for simple calculations and e-commerce price calculators.

## Scientific

Full scientific mode with:
- **Trigonometry**: sin, cos, tan + inverse functions
- **Logarithms**: log (base 10), ln (natural log)
- **Powers & Roots**: x², √, xʸ
- **Angle modes**: DEG, RAD, GRAD toggling
- **Memory**: M+, M-, MR, MC with status indicator
- **Secondary functions**: 2nd key for inverse trig, 10ˣ, eˣ

## Custom

Full JSON control over every button, layout, and behavior.

> **Pro tip**: Toggle the **f(x)** button in any mode to show the interactive graphing panel.`,
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
    keywords: 'embed widget html integrate website config theme position floating fixed',
    content: `# Embedding Calculators

Embed a fully interactive calculator into any website with two lines of HTML.

## Basic Embed

\`\`\`html
<script>window.CALCULO_API_KEY = 'demo';</script>
<script src="${SITE}/embed.js"></script>
<div data-calculator="demo_basic"></div>
\`\`\`

> **Note**: Set \`CALCULO_API_KEY\` to \`'demo'\` for demo configs, or your \`calc_live_*\` key for custom calculators.

## Available Demo IDs

| ID | Mode | Theme |
|----|------|-------|
| \`demo_basic\` | Basic | Dark |
| \`demo_scientific\` | Scientific | Dark |
| \`demo_light\` | Scientific | Light |
| \`demo_cyberpunk\` | Scientific | Dark |

## Configuration Attributes

Configure the embed via \`data-*\` attributes on the container div:

| Attribute | Description | Default | Example |
|-----------|-------------|---------|---------|
| \`data-calculator\` | Calculator ID (required) | — | \`demo_basic\` |
| \`data-theme\` | Theme override | from config | \`cyberpunk\`, \`ocean\`, \`light\` |
| \`data-type\` | Calculator type override | from config | \`basic\`, \`scientific\` |
| \`data-primary\` | Primary color override | from config | \`#ff0000\` |
| \`data-width\` | Widget width | \`340px\` | \`400px\`, \`100%\` |
| \`data-height\` | Widget height | auto | \`500px\` |
| \`data-position\` | Position mode | \`inline\` | \`inline\`, \`floating\`, \`fixed\` |
| \`data-fixed-bottom\` | Fixed bottom offset | \`20px\` | \`10px\` |
| \`data-fixed-right\` | Fixed right offset | \`20px\` | \`10px\` |

## Theme Override

\`\`\`html
<div data-calculator="demo_scientific"
  data-theme="cyberpunk"
  data-primary="#f0abfc">
</div>
\`\`\`

## Fixed/Floating Position

Pin the calculator to the bottom-right corner:

\`\`\`html
<div data-calculator="demo_basic"
  data-position="fixed"
  data-fixed-bottom="20px"
  data-fixed-right="20px">
</div>
\`\`\`

## Custom Size

\`\`\`html
<div data-calculator="demo_scientific"
  data-width="400px"
  data-height="600px">
</div>
\`\`\`

## How It Works

1. \`embed.js\` scans the page for \`[data-calculator]\` elements
2. Reads configuration from \`data-*\` attributes
3. Fetches the calculator config from \`${SITE}/api/embed/{id}\`
4. Applies theme/type/color overrides from attributes
5. Dynamically imports \`calculator-runtime.js\`
6. Renders the interactive calculator widget inside the div

## Custom Calculator Embed

Create a calculator via the API or dashboard, then embed it by ID:

\`\`\`html
<script>window.CALCULO_API_KEY = 'calc_live_your_key';</script>
<script src="${SITE}/embed.js"></script>
<div data-calculator="calc_abc123" data-theme="ocean"></div>
\`\`\`

## React Embed

\`\`\`tsx
import { Calculator } from '@calculo/react';

export function Demo() {
  return (
    <Calculator
      type="scientific"
      theme={{ mode: 'dark' }}
    />
  );
}
\`\`\`

## Iframe Embed

Embed as a standalone HTML page inside an iframe. The calculator renders as a complete, self-contained page with drag-to-move, resize handle, minimize button, theme switcher, and 3-dot menu.

### Basic Iframe

\`\`\`html
<iframe
  src="${SITE}/api/embed/demo_basic?html=1"
  width="340"
  height="520"
  style="border:none;border-radius:14px"
  loading="lazy"
></iframe>
\`\`\`

### Iframe with Theme

\`\`\`html
<iframe
  src="${SITE}/api/embed/demo_scientific?html=1&theme=cyberpunk"
  width="340"
  height="520"
  style="border:none;border-radius:14px"
></iframe>
\`\`\`

### Iframe with Custom Size

\`\`\`html
<iframe
  src="${SITE}/api/embed/demo_basic?html=1&width=400px&height=600px"
  style="border:none;border-radius:14px"
></iframe>
\`\`\`

### Iframe Query Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| \`html=1\` | Returns full HTML page (required) | — | \`?html=1\` |
| \`theme\` | Theme override | from config | \`theme=ocean\` |
| \`type\` | Calculator type override | from config | \`type=scientific\` |
| \`width\` | Widget width | \`340px\` | \`width=400px\` |
| \`height\` | Widget height | auto | \`height=600px\` |

### Iframe Features

- **Drag to move** — Grab the header bar to reposition
- **Resize handle** — Bottom-right corner grip to resize
- **Minimize (−)** — Collapses to a floating button (⊕)
- **3-dot menu (⋮)** — Switch between Basic/Scientific mode, change themes
- **16 themes** — Dark, light, oled, cyberpunk, ocean, and 11 more
- **30+ math functions** — Trig, hyperbolic, log, stats, combinatorics, constants
- **Keyboard support** — Enter to evaluate, Backspace to delete, Escape to clear

### Custom Calculator Iframe

\`\`\`html
<iframe
  src="${SITE}/api/embed/calc_abc123?html=1&theme=forest"
  width="340"
  height="520"
  style="border:none;border-radius:14px"
></iframe>
\`\`\`

## Best Practices

- Use \`demo_basic\` for simple arithmetic, \`demo_scientific\` for advanced math
- The calculator auto-resizes to fit its container
- Supports dynamic insertion — elements added after page load are automatically detected
- Use \`data-position="fixed"\` for always-visible calculators
- Lock theme and size in production to prevent user changes`,
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
    keywords: 'graph plot function svg',
    content: `# Graphing Guide

The graphing feature is a toggleable panel available inside any calculator.

## Getting Started

Click the **f(x)** button in the calculator header to show/hide the graph panel.

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

- **Grid**: Axis lines with tick marks
- **Range**: x: [-10, 10], y: [-10, 10]
- **Resolution**: 400 sample points per function
- **SVG rendering**: Crisp, scalable, theme-aware

## Adding Functions

Type an expression in the f(x) input field and press Enter or click away to plot. Click **+ add expression** to add more functions.`,
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

> **Pro tip**: Use the **f(x)** button to toggle the graphing panel and plot functions visually.
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
| \`type\` | string | \`basic\` | Calculator type: \`basic\`, \`scientific\` |
| \`theme\` | object | \`dark\` | Theme configuration |
| \`history\` | bool | \`true\` | Enable history |
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
    keywords: 'api rest endpoints evaluate calculators reference',
    content: `# API Reference

Base URL: \`${SITE}\`

## Evaluate (No Auth Required)

Evaluate a mathematical expression. No API key needed.

**GET** \`/api/embed/evaluate?expr={expression}&angle={deg|rad}\`

\`\`\`bash
curl "${SITE}/api/embed/evaluate?expr=sin(45)%2Bcos(30)&angle=deg"
# → {"result":1.5731,"expression":"sin(45)+cos(30)","angle":"deg"}
\`\`\`

**POST** \`/api/embed/evaluate\`

\`\`\`bash
curl -X POST "${SITE}/api/embed/evaluate" \\
  -H "Content-Type: application/json" \\
  -d '{"expr": "2^10 + sqrt(144)", "angle": "deg"}'
# → {"result":1036,"expression":"2^10 + sqrt(144)","angle":"deg"}
\`\`\`

### Supported Functions

sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, sqrt, cbrt, abs, ceil, floor, round, log (base 10), ln (natural), log2, exp, sign, pow, min, max, mod, pi, e

## Get Embed Config (No Auth)

Fetch a calculator's embed configuration.

**GET** \`${SITE}/api/embed/{id}\`

\`\`\`bash
curl "${SITE}/api/embed/demo_basic"
# → {"id":"demo_basic","type":"basic","theme":{...}}
\`\`\`

## Create Calculator (Auth Required)

**POST** \`/api/calculators\`

\`\`\`bash
curl -X POST "${SITE}/api/calculators" \\
  -H "Authorization: Bearer calc_live_key" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "scientific", "theme": {"mode": "dark"}}'
\`\`\`

## Delete Calculator (Auth Required)

**DELETE** \`/api/calculators/:id\`

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| \`VALIDATION_ERROR\` | 422 | Missing or invalid parameters |
| \`EVALUATION_ERROR\` | 422 | Expression evaluation failed |
| \`UNAUTHORIZED\` | 401 | Invalid or missing API key |
| \`RATE_LIMIT\` | 429 | Too many requests |`,
  },
  {
    id: 'embed-locking',
    section: 'Guides',
    title: 'Embed Locking & Configuration',
    keywords: 'lock freeze restrict embed config export settings customization',
    content: `# Embed Locking & Configuration

The draggable calculator wrapper provides lock controls via the **⋮** (three-dot) dropdown menu.

## Available Locks

| Lock | Effect |
|------|--------|
| **Lock Theme** | Prevents theme changes, hides the theme panel |
| **Lock Size** | Removes the resize handle, fixes dimensions |
| **Lock Mode** | Disables mode switching (basic ↔ scientific) |

## Config Export

Use the **Config** tab in the ⋮ dropdown to export the current calculator state as JSON.

## Programmatic Configuration

\`\`\`typescript
import { Calculo } from '@calculo/sdk';

const config = {
  type: 'scientific' as const,
  theme: { mode: 'dark', primaryColor: '#6366f1' },
};

const calc = await calculo.createCalculator(config);
console.log(calc.id); // "calc_abc123"
\`\`\`

This saves the configuration server-side and generates a unique calculator ID (requires API key).

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

const calculo = new Calculo(); // no API key needed for client-side eval

// Evaluate an expression
const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2'
});
\`\`\`

The SDK evaluates expressions client-side by default. No network requests, no API key needed.

## Framework SDKs

| SDK | Package | Install |
|-----|---------|---------|
| React | \`@calculo/react\` | \`npm install @calculo/react\` |
| Vue | \`@calculo/vue\` | \`npm install @calculo/vue\` |
| Angular | \`@calculo/angular\` | \`npm install @calculo/angular\` |
| Svelte | \`@calculo/svelte\` | \`npm install @calculo/svelte\` |

### React Example

\`\`\`tsx
import { Calculator } from '@calculo/react';

export function App() {
  return <Calculator type="scientific" theme={{ mode: 'dark' }} />;
}
\`\`\`

## Embed (No Build Step)

\`\`\`html
<script>window.CALCULO_API_KEY = 'demo';</script>
<script src="${SITE}/embed.js"></script>
<div data-calculator="demo_basic"></div>
\`\`\`

See [Embedding Calculators](#embedding) for configuration options (theme, position, size).`,
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

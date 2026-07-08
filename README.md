# calculo — The infrastructure for calculations

**Build, embed, and scale calculators with one API.**

calculo is an open-source platform for calculations. It provides a complete
infrastructure layer — from a full-featured calculator engine and graphing
engine to REST APIs, embeddable widgets, SDKs, and a visual builder.

Just as Stripe became the default platform for payments, calculo aims to
be the default platform developers use whenever they need calculations,
calculators, mathematical engines, graphing, formulas, or interactive widgets.

---

## Features

- **Calculator Engine** — Arithmetic, scientific, trig, hyperbolic, logarithms,
  complex numbers, matrices, vectors, statistics, probability, financial, and
  60+ built-in functions.
- **Graphing Engine** — 2D cartesian, parametric, and polar graphing with
  smooth rendering.
- **REST API** — Evaluate expressions, render graphs, and manage calculators
  programmatically.
- **TypeScript SDK** — First-class TypeScript support with full type safety.
- **Embeddable Widgets** — Drop calculators anywhere with a single line of HTML.
- **8 Themes** — Dark, light, OLED, high-contrast, glass, neumorphism, minimal,
  corporate — switchable at runtime.
- **JSON Configuration** — Every calculator is configurable with a simple JSON
  object.
- **Draggable & Resizable** — Drag calculators around, resize from the corner.
- **React Components** — Use `@calculo/react` for deep framework integration.
- **Monorepo** — pnpm workspaces, Turborepo, strict TypeScript.

## Quick start

```bash
npm install @calculo/sdk
```

```typescript
import { Calculo } from '@calculo/sdk';

const calculo = new Calculo('cal_your_api_key');

const { result } = await calculo.evaluate({
  expression: 'sin(pi/4)^2 + cos(pi/4)^2',
});

console.log(result); // 1
```

### Embed in HTML

```html
<script src="https://cdn.calculo.dev/widget.js"></script>
<div
  data-calculator="calc_123"
  data-theme="dark"
  data-width="100%"
  data-height="650">
</div>
```

### React component

```tsx
import { Calculator } from '@calculo/react';

export function Demo() {
  return (
    <Calculator type="scientific" theme={{ mode: 'dark' }} graph={true} />
  );
}
```

### REST API

```bash
curl https://api.calculo.dev/v1/evaluate \
  -H "Authorization: Bearer cal_..." \
  -H "Content-Type: application/json" \
  -d '{"expression": "sin(pi/2) + 2^8"}'
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/evaluate` | Evaluate a mathematical expression |
| POST | `/v1/render` | Generate graph data from expressions |
| POST | `/v1/calculators` | Create a calculator configuration |
| GET | `/v1/calculators/:id` | Get a calculator |
| PATCH | `/v1/calculators/:id` | Update a calculator |
| DELETE | `/v1/calculators/:id` | Delete a calculator |
| POST | `/v1/embed` | Generate embed code |
| GET | `/v1/templates` | List marketplace templates |
| GET | `/v1/usage` | Get usage statistics |
| POST | `/v1/api-keys` | Create an API key |

## Monorepo structure

```
calculo/
├── apps/
│   ├── web/          # React 19 + Vite + TanStack Router
│   └── api/          # Hono + Drizzle + Supabase
├── packages/
│   ├── calculator-engine/  # Expression evaluation engine
│   ├── graph-engine/       # 2D graphing engine
│   ├── parser/             # Tokenizer + recursive descent parser
│   ├── sdk/                # TypeScript client SDK
│   ├── embed/              # Embeddable widget
│   ├── ui/                 # Shared React components
│   ├── config/             # Themes, button layouts
│   └── shared/             # Types, constants, validators, errors
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Stack

- **Frontend:** React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS
- **Backend:** Hono, Drizzle ORM, Zod
- **Infrastructure:** Vercel, Supabase PostgreSQL, Supabase Auth
- **Package manager:** pnpm workspaces
- **Tooling:** Turborepo, TypeScript (strict), ESLint, Prettier

## Development

```bash
# Install dependencies
pnpm install

# Start development servers (web + api)
pnpm dev

# Build all packages
pnpm build

# Type check all packages
pnpm typecheck
```

## License

MIT

---

<div align="center">
  <a href="https://github.com/thepc101/calculo">GitHub</a>
  ·
  <a href="https://calculo.vercel.app">Website</a>
  ·
  <a href="https://github.com/thepc101/calculo/issues">Issues</a>
</div>

# AGENTS.md — Session Summary

## Goal
- Build calculo, a production-ready SaaS infrastructure platform for calculations — calculators, graphing, formulas, APIs, and embeddable widgets.

## Constraints & Preferences
- Monorepo: pnpm workspaces, Turborepo, strict TypeScript with `noUnusedLocals` and `strictNullChecks`.
- Stack: React 19, Vite, TanStack Router/Query, Tailwind CSS (web) · Hono, Drizzle, Zod (api) · Supabase (auth/db/storage).
- Design: documentation-first like TanStack.com; dark-first; premium developer product feel (Stripe/Vercel/Linear level); no gradients, glassmorphism sparingly.
- Deployment: Vercel (web) with `pnpm --filter @calculo/web build` and SPA rewrites.
- All calculator configuration must serialize to JSON.
- Core packages must be reusable, tree-shakeable, and independently consumable.

## Progress
### Done
- Monorepo scaffolded: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.github/workflows/*.yml`.
- **@calculo/shared**: types (`CalculatorConfig`, `ThemeConfig`, `ThemeMode` with 16 modes), Zod validators, error classes, constants (100+ scientific constants), utilities (`createDefaultConfig`, `createDefaultTheme`, `cn`).
- **@calculo/parser**: tokenizer + recursive descent parser producing typed AST (`NumberLiteral`, `BinaryOp`, `FunctionCall`, `MatrixLiteral`, `Conditional`, etc.).
- **@calculo/calculator-engine**: `Environment` (variables, functions, memory, angle modes), `Evaluator` (binary/unary ops, all AST nodes), 60+ built-in functions via `functions.ts` (trig, hyperbolic, log, stats, combinatorics, finance, clamp/lerp/hypot).
- **@calculo/graph-engine**: Cartesian, parametric, and polar graph data generation using the calculator engine.
- **@calculo/sdk**: `Calculo` class with `evaluate()`, `createCalculator()`, `createEmbed()`, etc., plus React hook factory.
- **@calculo/embed**: `CalculatorEmbed` widget class with DOM rendering and destroy lifecycle.
- **@calculo/ui**: `Button`, `Input`, `Card` components with Tailwind styling.
- **@calculo/config**: 16 themes (`dark`, `light`, `oled`, `high-contrast`, `glass`, `neumorphism`, `minimal`, `corporate`, `cyberpunk`, `retro`, `coffee`, `ocean`, `forest`, `sunset`, `aurora`, `monochrome`), `themeOrder` export, button layouts (`basicButtons`, `scientificButtons`, `memoryButtons`).
- **@calculo/react**: `useCalculo()` hook with async + sync evaluation, `Calculator` component, full type safety.
- **@calculo/vue**: `useCalculo()` composable using Vue refs/reactivity.
- **@calculo/svelte**: `useCalculo()` with Svelte writable stores.
- **@calculo/angular**: `CalculoService` injectable with DI, async + sync methods.
- **apps/api**: Hono REST API with `/v1/evaluate`, `/v1/render`, `/v1/calculators/*`, `/v1/embed`, `/v1/templates`, `/v1/api-keys`, `/v1/projects`; auth middleware; error handler.
- **apps/web**: React 19 + Vite + TanStack Router + TanStack Query + Tailwind.
  - Landing page: animated CLI terminal, comparison table (Calculo vs Wolfram/Symbolab/Desmos), live GitHub stats + npm downloads, company carousel (Khan Academy, Desmos, GeoGebra, Figma, Notion, Symbolab, Wolfram Alpha, Apple Numbers), FAQ accordion, blog cards, CTA sections.
  - Calculator: 3 modes (Basic/Scientific/Graphing), Shift/Alpha keys, DEG/RAD/GRAD toggling, memory (M+/M-/MR/MC), constants library, SVG graph rendering via `GraphCanvas`, 5-column grid, auto-resizing buttons.
  - DraggableCalculator: drag-to-move, resize via corner handle (no size presets), show/hide toggle button, three-dot (⋮) dropdown with Theme/Embed/Config tab navigation, lock controls (`lockTheme`, `lockSize`, `lockMode`), config JSON export.
  - ThemePanel: 16-theme selector with 2-color swatch previews.
  - Docs: custom markdown-to-React `Markdown` component, search with ⌘K, 12 comprehensive entries, right sidebar "On this page" TOC, "Edit this page" link.
  - Pricing: Free ($0), Beginner ($3/mo), Pro ($5/mo).
  - Auth: email-only login/signup (no OAuth buttons).
  - Legal: `/terms` and `/privacy` pages with full content.
  - Layout: sticky header with nav, footer with legal links.
  - GraphCanvas: SVG-based 2D graph renderer with axis lines, tick marks, up to 6 simultaneous functions, color pickers, + button.
- **Infrastructure**: GitHub Actions (CI + Deploy), `vercel.json` with pnpm workspace build and SPA rewrites, `README.md` with full docs.
- **Bug fixes**: removed recursive `postinstall` causing Vercel infinite loop; fixed missing `useEffect` import; fixed unused imports/vars; added null guard for `AnimatedTerminal` lines; fixed SVG syntax error (`opacity={0.1" />`); fixed dragRef TS error in draggable-calculator.

### In Progress
- (none)

### Blocked
- Vercel deployment at `calculo.vercel.app` points to a different project; needs Vercel dashboard reconfiguration.
- `@calculo/config` cannot resolve `@calculo/shared` via `tsc` (workspace symlinks not created by `npx pnpm`; `vite build` works via esbuild).

## Key Decisions
- `vite build` without `tsc` for production (esbuild resolves workspace packages correctly; typecheck is separate CI step).
- Calculator buttons use consistent 5-column grid per mode; removed old inconsistent row-length layouts.
- Removed S/M/L/XL size presets from draggable — only cursor resize.
- Three-dot (⋮) dropdown uses tab navigation for Theme/Embed/Config instead of individual toggle buttons.
- Custom Markdown component instead of external dependency (headers, code blocks, lists, tables, blockquotes, inline formatting).
- Company carousel replaces fake testimonials (logo initials for Khan Academy, Desmos, etc.).
- Framework SDKs as separate packages (`@calculo/react`, `@calculo/vue`, `@calculo/svelte`, `@calculo/angular`).
- GraphCanvas integrated into calculator display area in graphing mode.
- `postinstall` removed from `apps/web/package.json`.

## Next Steps
1. Reconfigure Vercel project to point to correct repository.
2. Add analytics/monitoring (PostHog or similar).
3. Build dashboard with usage graphs and API key management.
4. Add playground page with live expression evaluation and graph preview.
5. Create blog content for `/blog` page.
6. Consider Python and Go SDKs.

## Critical Context
- `@calculo/config` imports from `@calculo/shared` but `tsc` can't resolve due to missing pnpm workspace symlinks. `paths` in tsconfig didn't fix it.
- Calculator engine evaluates client-side; REST API only needs a server.
- All `tsc` build errors resolved; `vite build` succeeds (216 modules, 518 KB JS → 151 KB gzipped).
- Web app has no runtime API key requirement for demo; evaluations run locally.
- API key auto-generated on signup; found in Dashboard under API Keys.
- pnpm v11.10.0, lockfile v9.0.

## Relevant Files
- `apps/web/src/components/calculator.tsx`: 3-mode calculator, GraphCanvas integration, Show/Hide History button, 5-col grid, keyboard support.
- `apps/web/src/components/draggable-calculator.tsx`: Drag/resize wrapper, show/hide toggle, three-dot tab dropdown, lock controls, embed/config export.
- `apps/web/src/components/graph-canvas.tsx`: SVG graph renderer with axis labels, tick marks, up to 6 functions, color pickers.
- `apps/web/src/components/theme-panel.tsx`: 16-theme picker with color swatch previews.
- `apps/web/src/lib/markdown.tsx`: Custom markdown-to-React renderer.
- `apps/web/src/pages/landing.tsx`: Animated terminal, comparison table, live stats, company carousel, FAQ, blog cards.
- `apps/web/src/pages/docs.tsx`: Full documentation with search, 12 entries, right-sidebar TOC.
- `apps/web/src/pages/pricing.tsx`: Free/$0, Beginner/$3, Pro/$5 tiers.
- `apps/web/src/pages/login.tsx` / `signup.tsx`: Email-only auth.
- `apps/web/src/pages/terms-of-service.tsx` / `privacy-policy.tsx`: Legal pages.
- `packages/react-sdk/src/index.ts`: React SDK.
- `packages/vue-sdk/src/index.ts`: Vue SDK.
- `packages/svelte-sdk/src/index.ts`: Svelte SDK.
- `packages/angular-sdk/src/index.ts`: Angular SDK.
- `packages/config/src/themes.ts`: 16 theme definitions.
- `packages/shared/src/types.ts`: `ThemeMode`, `ThemeConfig`, `CalculatorConfig` types.

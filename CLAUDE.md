# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page React app that visualizes long-term investment growth across Czech/EU
brokerage platforms, comparing how each platform's fee structure eats into returns over
time. Inputs (base + monthly investment, expected annual return, years, number of
instruments) drive a month-by-month compounding simulation per platform, rendered as an
overlaid line chart. No backend — all state is in-memory, deployed as a static site to
GitHub Pages.

## Commands

- `pnpm dev` — Vite dev server with HMR (use pnpm; lockfile is `pnpm-lock.yaml`)
- `pnpm build` — type-check (`tsc -b`) then Vite production build to `dist/`
- `pnpm lint` — ESLint over the repo
- `pnpm preview` — serve the built `dist/` locally
- `pnpm deploy` — `gh-pages -d dist` (publishes `dist/` to GitHub Pages; run `build` first)

There are no tests in this project.

## Architecture

The codebase splits cleanly into **calculation** (`src/strategies/`) and **presentation**
(`src/components/` + `src/App.tsx`).

### The simulation engine — `src/strategies/index.ts`

`calculatePlatformPlan(plan, platform)` is the core. It walks `plan.years * 12` months,
compounding `portfolioValue` by the monthly-equivalent of the effective return, adding the
monthly investment after fees, and returns parallel arrays `portfolioValues[]` and
`investedValues[]` (one entry per month, index 0 = base investment). Key rules baked into the math:

- **Percentage fee is subtracted before the fixed fee** (`getInvestmentAfterFees`), and
  before the money is invested — these model currency-conversion and per-trade costs.
- **Annual percentage fees** (management fees) plus the **fund TER** are applied monthly as
  `annualRate / 12` against the growing portfolio value.
- **Effective return** is built up before the loop: the asset return has the **volatility drag**
  (`σ²/2`) subtracted, the **cash slice** (`isCash` allocations) blended down to ~0%, and the
  **FX drift** (`fxDriftPerYear`) multiplied in. `averageAnnualReturn` is the asset return in the
  *fund* currency (USD/EUR), not CZK.
- **Exit fee** (sell-side FX) is applied on output only — each plotted point is the net CZK you'd
  walk away with if you liquidated that month; the raw value still drives compounding.
- **Inflation** is not in the engine — it's a display-only deflation done in `Chart.tsx` when the
  "today's money" toggle is on, so engine output stays nominal.

### Fees as data — `src/strategies/types.ts` + `src/strategies/platforms.ts`

Each platform is a `PlatformConfig` whose four fee fields (`fixedFee`, `percentageFee`,
`annualPercentageFee`, `exitFee`) are **either a flat `number` or a `DynamicFee` closure**:

```ts
type DynamicFee = (plan, portfolioValue, totalInvested, investment?) => number
```

The optional `investment` arg is the contribution being invested that month, so per-trade fees can
scale with amount. A platform may also set `fundTER` (override the plan-wide TER, for managed funds)
and `ignoreFundTER` (the 0%-fees baseline). This one signature lets every real-world fee model live
in the same engine — examples already in the file:

- **Tiered annual fee by portfolio size** — `edward`, `portu` via `marginalAnnualRate` (bands billed
  like tax brackets; Portu also discounts by years held).
- **Pay-off-a-debt model** — `partners` and `edward` via the shared `entryFeePayDown` helper: a total
  entry fee is amortized, a share of each early contribution (Partners 60%, Edward 100%) pays it down
  until cleared, then later contributions invest fee-free.
- **Per-instrument trade fee** — `ibkr`, `saxo` via `perInstrumentTradeFee` (charges the larger of the
  per-trade minimum or a percentage of the per-trade amount); `degiro` is a flat handling fee.
- **Flat percentage** — `patria`, `xtb`, `t212`, `etoro` (currency-conversion spread).
- `nofees` is a 0% baseline (also `ignoreFundTER`) — the pure market-return ceiling.

FX rates (`USD_TO_CZK`, `EUR_TO_CZK`) are ČNB reference rates hardcoded in `index.ts` — refresh them
there; they feed the per-trade fees, not the return path. The `calculatePercentageFeeWithFixedMinimum`
helper is an earlier per-instrument model, now superseded by `perInstrumentTradeFee`.

### UI — `src/App.tsx` and `src/components/`

- `App.tsx` holds the single `PlanConfig` state object and recomputes all platform plans in
  a `useMemo` over every platform whenever inputs change. The portfolio editor and currency
  selector are intentionally commented out — the portfolio is currently a hardcoded default
  and only `numberOfInstruments` (plus the financial inputs) is user-editable.
  Editable inputs now also include `volatility`, `fundTER`, `fxDriftPerYear`, and `inflation`,
  plus a "show in today's money" toggle (`showReal`) passed to the chart.
- `Chart.tsx` (Chart.js via `react-chartjs-2`) plots one line per platform plus a dashed
  "Invested Amount" reference line; supports drag/wheel/pinch zoom on the X axis. When `showReal`
  is on it deflates every series by `inflation` to today's purchasing power (display only).
- `PlatformFees.tsx` renders the fee-comparison table; `Header`/`Footer` are static.
- UI is **Ant Design** components + **Tailwind** utility classes used together.

## Conventions

- **Formatting (`.prettierrc`): tabs, width 2, `printWidth` 120, semicolons.** Match this.
- TypeScript is `strict` with `noUnusedLocals`/`noUnusedParameters` — the build fails on
  unused symbols, so prefix deliberately-unused params with `_`.
- Local imports use explicit `.ts`/`.tsx` extensions (`allowImportingTsExtensions`).

## Deployment gotcha

`vite.config.ts` sets `base: "/investment-plan"` (note: not `-2026`), so the built site
expects to live at `https://<user>.github.io/investment-plan/`. Platform logo paths in
`platforms.ts` are root-absolute (`/platforms/...`) and live in `public/platforms/`; if
logos 404 after deploy, the `base` prefix vs. these absolute asset paths is the first thing
to check.

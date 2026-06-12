# Projection Accuracy — Implementation Plan

> Companion to [`projection-accuracy-analysis.md`](./projection-accuracy-analysis.md). Read the
> analysis first — it explains *why* each change is needed. This file is the *what* and *how*.
> Status: not started. Each phase is independently shippable.

## How to use this document

Phases are ordered by **accuracy-gained per unit of effort** and by dependency. Phases 1–3 are
pure fee/data work and don't touch the return engine; Phase 4 is the one structural addition to
the simulation loop; Phase 5 is cleanup. You can ship after any phase.

Every task lists: **goal**, **why (accuracy impact)**, **files**, **concrete change**,
**verification**, **effort**. "Effort" is rough dev time, not including review.

There are currently **no tests** in this repo. Phase 0 adds a minimal test harness so the
later math changes are verifiable — do it first if you want regression safety, or skip it and
verify manually via `pnpm dev` if you're moving fast.

### Conventions to preserve

- Formatting (`.prettierrc`): **tabs, width 2, printWidth 120, semicolons.** Match exactly.
- `strict` TS with `noUnusedLocals`/`noUnusedParameters` — prefix unused params with `_`.
- Local imports use explicit `.ts`/`.tsx` extensions.
- Keep the `DynamicFee` closure architecture — do not refactor it (see analysis closing note).

---

## Phase 0 — Test harness (optional but recommended)

**Goal:** make the math changes in later phases verifiable and regression-safe.

**Why:** Phases 1, 3.1, and 4 change financial math. Without tests, a regression in the
compounding loop is invisible until someone eyeballs the chart. A handful of unit tests over
`calculatePlatformPlan` and the fee helpers pays for itself immediately.

**Files:**
- Add `vitest` to `devDependencies` (the research found Finanzfluss's TS calculators use
  exactly this stack — Vitest + Zod — as a precedent).
- New: `src/strategies/index.test.ts`.

**Concrete change:**
- `pnpm add -D vitest`, add `"test": "vitest"` to `package.json` scripts.
- Write baseline tests that pin current behaviour before changing it:
  - `nofees` platform: final value equals closed-form FV of an annuity
    `base*(1+i)^n + monthly * ((1+i)^n - 1)/i` (with `i` = monthly geometric rate, `n` = months),
    within rounding tolerance. This validates the core loop against a known formula.
  - `marginalAnnualRate`: a portfolio spanning 3 tiers returns the correct blended effective %.
  - `getInvestmentAfterFees`: percentage-before-fixed ordering.
  - Partners: entry fee fully amortizes and later contributions invest at 0 entry fee.

**Verification:** `pnpm test` green; `pnpm build` still passes.

**Effort:** ~1–2h.

---

## Phase 1 — Fund TER + managed-platform fees (Severity 1.1, highest priority)

This phase fixes the ranking-distorting bias. It has three sub-steps; do them together so the
comparison is internally consistent at the end.

### 1a. Add a fund TER dimension applied to every platform

**Goal:** model the underlying ETF/fund ongoing cost (TER) as an annual percentage drag on the
portfolio, for all platforms.

**Why (accuracy):** Self-directed brokers currently have `annualPercentageFee: 0`, so their
lines carry no ongoing drag at all — unrealistic. Every fund has a TER. Adding it lowers all
lines realistically and, crucially, sets the correct baseline against which the managed
platforms' *extra* fees are measured (see analysis §1.1).

**Files:** `src/strategies/types.ts`, `src/strategies/index.ts`, `src/App.tsx`,
`src/components/Chart.tsx` (only if a new input row is surfaced).

**Concrete change — two design options, pick one:**

- **Option A (simple, recommended first):** a single portfolio-wide TER on `PlanConfig`.
  - `types.ts`: add `fundTER: number;` to `PlanConfig` (annual %, default ~0.2).
  - `index.ts`: in `getPortfolioValueAfterFees`, fold it into the monthly drag:
    ```ts
    const annualPercentageFee = getFee(platform.fees.annualPercentageFee, portfolioValue, totalInvested) / 100;
    const monthlyDrag = (annualPercentageFee + plan.fundTER / 100) / 12;
    return portfolioValue * (1 - monthlyDrag);
    ```
  - `App.tsx`: add an input (default 0.2) with a tooltip explaining TER. Keep it editable so a
    user holding pricier active funds can raise it.
  - **Caveat:** this applies the *same* TER to managed platforms too. That's wrong for Edward/
    Partners if their stated management fee is meant to be all-in. Resolve in 1b/1c by deciding
    whether the managed platforms' fee is *on top of* or *inclusive of* fund TER. Document the
    decision in `platforms.ts` comments.

- **Option B (accurate):** per-platform `fundTER` on `PlatformConfig.fees`.
  - `types.ts`: add `fundTER?: number | DynamicFee;` to the `fees` object.
  - Self-directed brokers: `fundTER: 0.2` (the ETF TER the user actually picks).
  - Edward/Partners: set the underlying managed-fund TER (e.g. 1–2%) explicitly, *in addition*
    to their management fee, matching reality.
  - `index.ts`: add `fundTER` to the monthly drag like above but read from `platform.fees`.

  Option B is more correct for the managed-vs-self-directed gap; Option A is faster and fine if
  you treat managed-platform fees as all-in. **Recommendation:** ship A first (fixes the
  self-directed lines immediately), then upgrade to B as part of 1b/1c.

**Verification:** `nofees` line unchanged (TER is a portfolio cost, but decide if `nofees`
should also carry TER — arguably the "0% fees" baseline should stay TER-free as the theoretical
ceiling; document this). Self-directed lines drop by ~`TER%` annualised vs. before. Manual
sanity: at 0.2% TER over 30y the drag should be visible but small.

**Effort:** ~2–3h (Option A), +2h for Option B.

### 1b. Model Edward's entry fee and performance fee

**Goal:** add the entry fee and performance fee currently noted as "out of model"
(`platforms.ts:19-20`).

**Why (accuracy):** These are large real costs (entry up to 4–5% of a 10-year contribution
target; performance fee 0–25% over a high-water-mark). Omitting them makes Edward look far
cheaper than reality — the single worst ranking distortion in the model (analysis §1.1).

**Files:** `src/strategies/platforms.ts` (and possibly a small helper in `index.ts`).

**Concrete change:**
- **Entry fee:** reuse the Partners amortization pattern (`platforms.ts:64-80`) — a
  front-loaded fixed fee paid down by early contributions — adapted to Edward's published
  schedule. Encode it in Edward's `fixedFee` as a `DynamicFee`.
- **Performance fee:** this needs a high-water-mark, which the current per-month signature
  (`plan, portfolioValue, totalInvested`) doesn't carry. Two approaches:
  - Approximation (no signature change): apply the performance fee as an extra annual % on
    *gains above contributions* — `max(0, portfolioValue - totalInvested) * perfRate`, billed
    annually. Crude but captures the direction.
  - Accurate (needs engine support): thread a running high-water-mark through the loop and
    charge `perfRate * max(0, portfolioValue - HWM)` when a new high is reached. This is a
    Phase-4-adjacent engine change; defer if doing the approximation now.
- Document the chosen Edward schedule and source URL in comments (the config already links
  `edwardinvest.cz/docs/jake-poplatky-klient-plati/`).

**Verification:** Edward's line should drop noticeably, especially in early years (entry fee)
and in strong-return scenarios (performance fee). Compare the projected total fees against
Edward's own published examples if available.

**Effort:** ~3–4h (approximation), more for true HWM.

### 1c. Add Partners' underlying fund TER

**Goal:** add the ~1–2% underlying fund TER noted as out of model (`platforms.ts:82`).

**Why (accuracy):** Partners is a managed product; its 1% platform fee is *on top of* a pricey
underlying fund. Omitting the fund TER understates Partners' total cost by roughly half
(analysis §1.1).

**Concrete change:** if Option B from 1a is adopted, set Partners' `fundTER` to the real value
(e.g. 1.5%). If Option A, raise Partners' `annualPercentageFee` to bundle platform + fund TER
and document that it's a combined figure.

**Verification:** Partners' ongoing drag roughly doubles; line drops accordingly.

**Effort:** ~30min once 1a's design is settled.

---

## Phase 2 — Inflation / real-terms toggle (Severity 2.1)

**Goal:** let the user see projected values in today's purchasing power.

**Why (accuracy):** Nominal values over 14–50 years grossly overstate real wealth (analysis
§2.1). This is a display transform — it doesn't change the comparison, just makes the headline
number honest. High value-to-effort because it's isolated.

**Files:** `src/strategies/types.ts`, `src/App.tsx`, `src/components/Chart.tsx`.

**Concrete change:**
- `types.ts`: add `inflation: number;` to `PlanConfig` (annual %, default ~2.5–3).
- Add a "Show in today's money" toggle in `App.tsx`.
- When on, deflate each plotted point: `realValue = nominalValue / (1 + inflation/100) ** (monthIndex/12)`.
  Apply at the Chart layer so the engine output stays nominal (single source of values).
- Label the axis/legend clearly ("real" vs "nominal") so the two modes aren't confused.

**Verification:** with inflation 3% over 40y, real values should be ~30% of nominal
(`1.03^40 ≈ 3.26`). Toggle off returns to current numbers exactly.

**Effort:** ~2h.

---

## Phase 3 — Targeted fee/correctness fixes (Severity 3.1, 3.2)

### 3a. Resolve Partners 40% vs 60% discrepancy

**Goal:** settle whether 40% or 60% of each contribution goes to the entry fee, and align
code + comment + `CLAUDE.md`.

**Why (accuracy):** The amortization speed controls Partners' early-years drag; the code (60%)
and `CLAUDE.md` (40%) disagree, so one is wrong (analysis §3.1).

**Files:** `src/strategies/platforms.ts:64-80`, and `CLAUDE.md`.

**Concrete change:** verify against the official Partners "předplacený poplatek" schedule,
then make the `* 0.6` factors and all comments consistent. **Do not guess** — confirm the real
number first. The amortization *structure* is correct; only the percentage is in question.

**Verification:** add/adjust a Phase-0 test asserting the entry fee clears after the expected
number of months for a known input.

**Effort:** ~1h once the real figure is confirmed.

### 3b. Per-instrument fee: charge `max(min, pct)` instead of always the minimum

**Goal:** stop undercharging large buys on IBKR/Saxo/Degiro.

**Why (accuracy):** The current `numberOfInstruments * minFee` ignores the percentage
component, which exceeds the minimum for large base/monthly amounts (analysis §3.2).

**Files:** `src/strategies/platforms.ts:128,141,167`; reuse `calculatePercentageFeeWithFixedMinimum`
(`index.ts:39-62`, currently unused).

**Concrete change:** replace the flat `numberOfInstruments * EUR_TO_CZK * MIN` closures with a
per-instrument `max(minFee, pct * amountPerInstrument)`. The existing helper already does this
shape (and respects `isCash`); wire it in or inline its logic. Note the helper takes the
*investment amount*, so the `DynamicFee` needs the contribution being invested — for the fixed
fee that's the monthly/base amount available in the loop.

**Verification:** small contributions (defaults) → fee unchanged (minimum still binds). Large
base (e.g. 1,000,000 Kč) → fee rises above the flat minimum. Add a test for both regimes.

**Effort:** ~2h.

---

## Phase 4 — Volatility / Monte Carlo (Severity 1.2, the credibility centerpiece)

**Goal:** stop overstating returns by treating an average as a guaranteed compound rate; show
a realistic range of outcomes.

**Why (accuracy):** A volatile series realises a geometric return below its arithmetic mean by
~`σ²/2` (~1.3%/yr at σ=16%), so the deterministic projection systematically overshoots over long
horizons. Monte Carlo also surfaces sequence-of-returns risk, which matters when contributing
monthly (analysis §1.2). This is the biggest single upgrade to absolute credibility.

**Files:** `src/strategies/index.ts` (new simulation path), `src/strategies/types.ts`,
`src/App.tsx`, `src/components/Chart.tsx`. Optional dep: `d3-random` (`randomLogNormal`) for the
draws (research-recommended; well-typed).

**Concrete change — phased within the phase:**

- **4a (cheap, ship first):** add a `volatility` input and apply the geometric correction to
  the deterministic engine: use `effectiveAnnual = r − (σ/100)² / 2 * 100` (i.e. subtract
  `σ²/2`) when converting to the monthly rate. Plus a tooltip clarifying the return input is a
  geometric/CAGR assumption. This removes the systematic overstatement with almost no new code.

- **4b (full):** add a Monte Carlo mode.
  - `pnpm add d3-random`.
  - New function `simulatePlatformPlanMonteCarlo(plan, platform, { paths, volatility, seed })`
    that runs the existing monthly loop `paths` times, each month drawing a return from a
    log-normal with the given mean/σ, then reports per-month percentiles (P10/P50/P90) across
    paths. Keep the deterministic `calculatePlatformPlan` as the default/fast path.
  - **Determinism:** `Math.random()` is fine in the app at runtime, but if any of this ever runs
    in a workflow/test harness, seed the RNG (d3-random accepts a custom source) so results are
    reproducible. For unit tests, always seed.
  - `Chart.tsx`: render the P50 line per platform with a shaded P10–P90 band (Chart.js fill
    between datasets). This visually communicates uncertainty far better than a single line.
  - Guard performance: `paths * months * platforms` is the cost. ~1,000 paths × 600 months × 11
    platforms ≈ 6.6M iterations — fine in a `useMemo`, but debounce the inputs and consider a
    "Run simulation" button rather than recomputing on every keystroke.

**Verification:** 4a — at σ=16%, the projected final value drops by roughly the compounded
effect of 1.3%/yr vs. the old line. 4b — P50 should sit near the 4a deterministic line; the
P10–P90 band should widen with σ and with horizon. Sanity-check that a σ of 0 collapses the band
onto the deterministic line.

**Effort:** 4a ~2h; 4b ~1–2 days including chart work.

---

## Phase 5 — Cleanup (Severity 2.3, 3.3, 3.4, 3.5)

Small correctness/polish items. Batch them; none is individually urgent.

### 5a. Cash reserve should not earn the equity return (§2.3)
- `index.ts:117` / portfolio handling: compute an effective return that blends the `isCash`
  weight at a cash rate (input, default ~0%) with the equity return for the rest:
  `effectiveReturn = equityReturn * (1 - cashWeight) + cashReturn * cashWeight`. Or, simpler,
  drop the cash line from the default portfolio. Currently `isCash` is dead data in the main
  loop. Effort ~1–2h.

### 5b. Contribution timing convention (§3.3)
- Decide beginning-vs-end-of-month and document it. For beginning-of-month, grow
  `(portfolioValue + investment)` in `index.ts:116-117`. Low materiality; mainly about being
  explicit. Effort ~1h.

### 5c. Stop rounding inside the loop (§3.4)
- `index.ts:119-120`: keep full precision in `portfolioValues`/`totalInvested`; move `Math.round`
  to the display layer (`Chart.tsx`, `PlatformFees.tsx`). Effort ~1h.

### 5d. Disclose FX / currency-risk assumption (§3.5)
- No code change needed beyond a UI note: the entered return is assumed to be in CZK terms and
  currency fluctuation of foreign ETFs is not modeled. Add to a tooltip or a small "assumptions"
  footnote. Effort ~30min.

---

## Suggested shipping order (recap)

1. **Phase 1** — fixes the ranking bias (the product's core correctness). Do 1a → 1c → 1b.
2. **Phase 3a** — quick, possibly a real bug (Partners %).
3. **Phase 2** — inflation toggle; cheap, high perceived value, isolated.
4. **Phase 4a** — volatility-drag correction; removes the systematic overshoot with little code.
5. **Phase 4b** — full Monte Carlo bands; the credibility centerpiece, larger.
6. **Phase 3b + Phase 5** — edge-case fee fix and cleanup batch.

Phase 0 (tests) is recommended before Phase 1 if regression safety matters; otherwise verify via
`pnpm dev`.

## Cross-cutting: an "assumptions" panel

Several fixes (2.2 taxes, 3.5 FX, the return semantics, inflation rate) are partly about
*disclosure*. Consider a small collapsible "Assumptions & limitations" panel in the UI that
states, in plain language, what is and isn't modeled (taxes excluded, currency risk excluded,
returns assumed constant unless Monte Carlo is on, fund TER default, etc.). This turns silent
omissions into stated, defensible choices and is the cheapest single boost to the tool's
trustworthiness.

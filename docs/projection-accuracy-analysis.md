# Projection Accuracy Analysis

> Status: analysis only — no code changed.
> Companion document: [`projection-accuracy-plan.md`](./projection-accuracy-plan.md) (the implementation plan).
> Date of analysis: 2026-06-11. Code reviewed: `src/strategies/index.ts`, `src/strategies/types.ts`, `src/strategies/platforms.ts`, `src/App.tsx`.

## Purpose

This document audits **how accurate the long-term growth projection is** in the current
engine, and explains *why* each gap matters. It is deliberately separate from the plan: this
file is the "why", the plan file is the "what/how". Read this first.

The tool's core promise is **a fair, fee-aware comparison of platforms over time**. So we
judge accuracy on two axes:

1. **Absolute accuracy** — is the projected portfolio value for a single platform realistic?
2. **Comparative accuracy** — is the *ranking* and *gap* between platforms realistic?

Axis 2 is the one that matters most for this product. A model can be wrong in absolute terms
(everyone too high by the same factor) and still rank platforms correctly. The dangerous
errors are the ones that distort the ranking — and the current model has one large
ranking-distorting bias (see §1.1).

## What the engine already does correctly

Before the gaps, it's worth stating what is sound, so we don't "fix" it later:

- **Geometric monthly return conversion** — `index.ts:107` uses
  `(1 + annualReturn/100) ** (1/12)`, not the naive `annualReturn/12`. This is correct; the
  naive version would overstate compounding.
- **Annual fee billed on the growing balance, monthly** — `getPortfolioValueAfterFees`
  (`index.ts:98-103`) applies `annualFee/12` against the current portfolio value each month.
  Charging it on the compounding balance (not the contributions) is the right model for a
  management/custody fee. The multiplicative monthly application means the realised annual
  drag is `1-(1-f/12)^12 ≈ f - f²/2`, i.e. a negligible second-order under-charge (~0.018%
  at f=1.89%). Not worth changing.
- **Marginal tiered fees** — `marginalAnnualRate` (`index.ts:20-37`) bills each band of the
  portfolio at its own rate (like tax brackets) and is recomputed each month on the current
  value, so the effective rate adjusts smoothly as the portfolio crosses tier boundaries.
  This is how Edward and Portu actually bill, and it's accurate.
- **Fee ordering** — percentage fee (FX/conversion) is subtracted before the fixed fee and
  before investing (`getInvestmentAfterFees`, `index.ts:68-70`). Correct for currency
  conversion + per-trade costs.

The accuracy gaps below are almost all **things left out of the model**, not math errors in
what's implemented.

---

## Severity 1 — distorts the comparison ranking

These are the highest priority because they break axis 2 (comparative accuracy), which is the
product's whole point.

### 1.1 Omitted fund TER and managed-platform fees make managed platforms look artificially cheap

**What's missing:**

- **Fund TER (Total Expense Ratio) is out of the model for every platform.** The underlying
  ETFs/funds charge an ongoing annual fee (~0.1–0.5% for typical index ETFs). For the
  self-directed brokers (IBKR, XTB, Degiro, Saxo, T212, Patria) this fund TER is the *only*
  ongoing percentage drag — and the model currently shows them with `annualPercentageFee: 0`.
  Their projected lines are therefore **too high**.
- **Edward** (`platforms.ts:19-28`): the inline comment already admits the **entry fee
  (up to 4–5%)** and the **performance fee (0–25% over a high-water-mark)** are out of model.
  On top of that, the 1.89%→0.99% management fee sits *above* the underlying fund TER, which
  is also omitted. Edward's true total cost is far higher than plotted.
- **Partners** (`platforms.ts:82-83`): the comment notes "underlying fund TER (~1–2%) is out
  of model." For a managed product that is a very large omission — only the entry-fee
  amortization plus a flat 1% platform fee are modeled.

**Why this matters (why it's Severity 1):**

The tool exists to show that fees eat returns. Under-counting fees *specifically on the most
expensive products* (the managed platforms Edward and Partners) is the worst possible
direction for the bias: it makes the expensive options look competitive with the cheap ones.
A user could look at the chart and conclude Edward is only slightly behind a self-directed
ETF broker, when in reality the management + entry + performance + underlying-fund fees create
a much larger gap. This is a correctness problem for the product's central claim.

**How fixing it improves accuracy:**

- Adding a fund TER drag to *every* platform corrects the self-directed lines (which are
  currently drag-free) and restores the real gap between "pay only the ETF TER" vs. "pay a
  manager on top of the ETF TER".
- Modeling Edward's entry fee (the same amortization shape Partners already uses) and its
  performance fee, plus Partners' underlying TER, makes the managed-vs-self-directed gap
  reflect reality.

### 1.2 A single deterministic return overstates the outcome (volatility drag)

**What happens:** `averageAnnualReturn` is compounded perfectly smoothly every month
(`index.ts:107` and `:117`). There is no volatility.

**Why this is inaccurate:** Real equity returns vary year to year. For any volatile return
series, the **geometric (actually-realised) return is lower than the arithmetic average** by
approximately `σ²/2`, where σ is the annual volatility. For a diversified equity portfolio
σ ≈ 15–16%, so the drag is roughly `0.16²/2 ≈ 1.3%` per year. Over 14–50 years of
compounding, silently treating a ~9.5% *arithmetic average* as a *guaranteed geometric* rate
produces a large overshoot in the projected final value.

The subtle trap is semantic: the input is labelled "Average Annual Return". If the user types
the historical *average* (an arithmetic mean), the engine treats it as a *certain compound*
rate — and those are not the same number for a volatile asset.

**Why it matters less for ranking, more for absolute trust:** Because the same return is
applied to all platforms, volatility drag scales every line roughly together, so it doesn't
badly distort the *ranking*. But it badly distorts the *absolute* numbers and the headline
"you'll have X" figure, which is what users emotionally anchor on. A projection that's
systematically optimistic erodes trust once a user checks it against reality.

**How fixing it improves accuracy:** Either (a) clarify the input is a geometric/CAGR rate
and that returns are assumed constant, (b) take a volatility input and apply the
`g ≈ r − σ²/2` correction, or (c) run a Monte Carlo simulation and show percentile bands
(P10/P50/P90). Option (c) is the most honest because it also visualises sequence-of-returns
risk — the fact that the *order* of good and bad years matters when you're adding
contributions (dollar-cost averaging into a falling-then-rising market ends very differently
from rising-then-falling, even at the same average return).

---

## Severity 2 — distorts absolute values or interpretation

### 2.1 No inflation / real-terms view

**What's missing:** Every figure is nominal (`index.ts` throughout — there is no inflation
term anywhere).

**Why it matters:** Over 14–50 years, nominal CZK massively overstates purchasing power. A
projected "10,000,000 Kč in 40 years" *feels* like wealth but at 3% inflation is worth roughly
3,000,000 Kč in today's money. Users make decisions on the nominal number and overestimate
what they're building.

**How fixing it improves accuracy:** Add an inflation input and a real-vs-nominal toggle that
deflates the projected values by `(1+inflation)^years` (or month-by-month). This doesn't touch
the comparison logic — it's a display transform — but it makes the headline number honest.

### 2.2 Taxes are out of the model

**What's missing:** No Czech dividend withholding tax and no capital-gains treatment.

**Why it matters (and why it's only Severity 2):** For long-term holders the Czech 3-year
time test largely exempts capital gains, so for the tool's typical 14+ year horizon the CGT
impact is small. Dividend withholding is a more persistent annual drag on the underlying
holdings, but for accumulating ETFs it's handled at fund level and is partly already implicit
in a net-of-fund return. So taxes are real but second-order for this audience. At minimum the
assumption ("long-term hold, capital gains assumed exempt, dividend withholding ignored")
should be disclosed so the omission is a stated choice, not a hidden error.

### 2.3 Cash reserve earns the full equity return

**What happens:** The default portfolio includes a 2% `Cash reserve` marked `isCash: true`
(`App.tsx:66-69`). But the engine applies `averageMonthlyReturn` to the *entire* portfolio
value (`index.ts:117`). The `isCash` flag is only ever read by the commented-out
`calculatePercentageFeeWithFixedMinimum` helper — the main loop ignores it. So the cash
reserve compounds at the full equity rate (e.g. 9.5%).

**Why it matters:** Cash earns roughly a money-market/0% real return, not the equity return.
Letting 2% of the portfolio compound at equity rates is a small but real overstatement, and
it's plainly inconsistent with labelling that slice "cash".

**How fixing it improves accuracy:** Either drop the cash line, or blend the return:
`effectiveReturn = equityReturn * (1 - cashWeight) + cashReturn * cashWeight`. Low materiality
(2% of the portfolio) but trivially correct and removes an obvious inconsistency.

---

## Severity 3 — numerical correctness / edges

### 3.1 Possible bug: Partners 40% vs 60% discrepancy

**The conflict:** `platforms.ts:64-80` — both the comment and the code use **60%** of each
contribution going to the entry fee (`totalInvested * 0.6`, `monthlyInvestment * 0.6`,
`baseInvestment * 0.6`). But the project's `CLAUDE.md` describes the Partners model as
**"40% of each contribution goes to paying it down."** One of these is wrong.

**Why it matters:** The amortization *speed* directly controls how much drag Partners carries
in the early years (when the entry fee is being paid off and only 40% — or 60%? — of each
contribution is actually invested). Getting the split wrong changes Partners' whole early-years
trajectory. Note the amortization *structure* is otherwise correct: the
`min(remaining, contribution * rate)` cap and the leftover-gets-invested behaviour
(`getInvestmentAfterFees(monthly, 0, remaining)`) are right — only the percentage is in doubt.

**How fixing it improves accuracy:** Verify against the real Partners "předplacený poplatek"
schedule, then align code + comment + `CLAUDE.md` to a single correct number.

### 3.2 Per-trade minimum assumed to always bind (undercharges large buys)

**What happens:** IBKR, Saxo, Degiro model the trade fee as `numberOfInstruments * minFee`
(`platforms.ts:128, 141, 167`), ignoring the percentage-per-trade component entirely.

**Why it's *mostly* fine:** For small monthly contributions the per-trade minimum genuinely
binds. With the defaults (8,000 Kč / 11 instruments ≈ 727 Kč per instrument), IBKR's 0.05%
would be ~0.36 Kč — far below the ~31 Kč (1.25 EUR) minimum. So the minimum is the real cost.

**Where it breaks:** For a **large one-time base investment** or a high monthly amount, the
percentage component exceeds the minimum and the model **undercharges**. Example: a 1,000,000
Kč base across 11 instruments is ~90,900 Kč per instrument; IBKR's 0.05% = ~45 Kč, which
exceeds the 31 Kč minimum — the model would still only charge the 31 Kč minimum.

**How fixing it improves accuracy:** Use `max(minFee, pct * amountPerInstrument)` per
instrument. The accurate helper `calculatePercentageFeeWithFixedMinimum` already exists
(`index.ts:39-62`) but is currently unused — it (or its logic) should be wired in.

### 3.3 End-of-month contribution timing slightly understates growth

**What happens:** Each monthly contribution is added *after* that month's growth is applied
(`index.ts:117`: grow the existing portfolio, then `+ investment`). So every contribution
misses the month it arrives in.

**Why it matters:** This is an "ordinary annuity" (end-of-period) assumption. Real monthly
investing is closer to beginning-of-period. The effect is a small systematic *understatement*
(~half a month of return on the contribution stream, on average). It partially offsets the
§1.2 overstatement, but the two are independent and shouldn't be relied on to cancel.

**How fixing it improves accuracy (if desired):** Grow `(portfolioValue + investment)`
instead, i.e. invest at the start of the month. Low materiality; document the chosen
convention either way.

### 3.4 Rounding inside the compounding loop

**What happens:** `index.ts:119-120` rounds both `totalInvested` and `portfolioValues` to whole
CZK *every month* and feeds the rounded value into the next month's compounding.

**Why it matters:** Negligible in magnitude (≤0.5 Kč/month, behaving like a random walk — on
the order of tens of CZK over decades on a multi-million balance). But it's avoidable
precision loss and slightly muddies any future reconciliation against a closed-form check.

**How fixing it improves accuracy:** Keep full floating-point precision in the arrays; round
only at the display layer (Chart, fee table). Clean-up, not a material correction.

### 3.5 FX rates are hardcoded point estimates

**What happens:** `USD_TO_CZK` and `EUR_TO_CZK` (`index.ts:3-4`) are hardcoded.

**Why it's *not* a projection-accuracy problem:** These constants are only used to express the
per-trade minimum fees in CZK — they don't feed the return path. So a stale FX rate slightly
misstates fee amounts but does not compound into the projection.

**The real (unmodeled) currency effect:** returns on foreign-denominated ETFs are subject to
CZK/USD and CZK/EUR fluctuation, which the model ignores (it assumes the entered return is
already in CZK terms). This is reasonable to leave out, but should be **disclosed** as an
assumption rather than silently omitted.

---

## Summary table

| # | Issue | Axis hit | Severity | Effort | Touches return engine? |
|---|-------|----------|----------|--------|------------------------|
| 1.1 | Fund TER + Edward/Partners fees omitted | Ranking | **High** | Medium | No (fee dimension) |
| 1.2 | Deterministic return / volatility drag | Absolute | **High** | Medium–High | Yes |
| 2.1 | No inflation / real terms | Absolute/interp. | Medium | Low | No (display) |
| 2.2 | Taxes omitted | Absolute | Medium–Low | Medium | Yes (or disclose) |
| 2.3 | Cash reserve earns equity return | Absolute | Low | Low | Yes (small) |
| 3.1 | Partners 40% vs 60% discrepancy | Ranking (Partners) | Medium | Low | No |
| 3.2 | Per-trade min always binds | Absolute (edge) | Low | Low | No |
| 3.3 | End-of-month contribution timing | Absolute | Low | Low | Yes (small) |
| 3.4 | Rounding inside loop | Absolute | Very low | Low | Yes (cleanup) |
| 3.5 | Hardcoded FX / currency risk | Disclosure | Low | Low | No |

## Design note: the `DynamicFee` architecture is fine

None of the above requires changing the `DynamicFee` closure pattern — it is the right shape
and already models tiered, amortized, and per-instrument fees cleanly. The Severity 1 fee work
(§1.1) only needs **one additional fee dimension** (fund TER) plumbed through `PlanConfig` /
`PlatformConfig`, plus two more fee terms on the managed platforms. The return-engine work
(§1.2, §2.x) is additive to the simulation loop, not a rewrite of it.

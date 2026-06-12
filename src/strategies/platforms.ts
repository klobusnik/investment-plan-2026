import type { PlanConfig, PlatformsConfig } from "./types";
import { EUR_TO_CZK, entryFeePayDown, getPlannedInvestments, marginalAnnualRate } from "./index.ts";

// Edward's entry fee is banded by the *target* total investment (June 2026 sazebník): a single flat rate
// applies to the whole plan, chosen by which band the planned total falls into (5% small → 2% large).
const edwardEntryRate = (plannedTotal: number): number => {
	if (plannedTotal < 300000) return 0.05;
	if (plannedTotal < 500000) return 0.045;
	if (plannedTotal < 1000000) return 0.04;
	if (plannedTotal < 2000000) return 0.035;
	if (plannedTotal < 5000000) return 0.03;
	return 0.02;
};

// Partners' current (2025/2026) model for NEW money: no entry fee, a redemption (exit) fee instead that
// declines with how long the position is held and is waived after ~5 years. Charged on liquidation only.
// Approximation: the engine liquidates the whole portfolio at the plotted month, so this treats all money
// as held since the plan started (exact per-contribution ageing is out of model).
const partnersExitFee = (
	_plan: PlanConfig,
	_portfolioValue: number,
	_totalInvested: number,
	_investment?: number,
	monthIndex?: number,
): number => {
	const yearsHeld = (monthIndex ?? 0) / 12;
	if (yearsHeld >= 5) return 0;
	if (yearsHeld >= 4) return 1;
	if (yearsHeld >= 3) return 2;
	if (yearsHeld >= 2) return 3;
	if (yearsHeld >= 1) return 4;
	return 5;
};

// Per-trade minimum commissions for brokers that charge per instrument (each ETF = one trade).
// EU-listed ETF floors, June 2026 — see research notes in the fee comments below.
const IBKR_MIN_FEE_EUR = 1.25; // IBKR Tiered, EU exchanges
const SAXO_MIN_FEE_EUR = 3; // Saxo Classic, EU exchanges
const DEGIRO_MIN_FEE_EUR = 1; // DEGIRO Core Selection on Tradegate (handling fee)

// Percentage-per-trade component; the larger of (minimum, pct × amount-per-instrument) is charged.
const IBKR_PCT = 0.05; // IBKR Tiered, EU exchanges
const SAXO_PCT = 0.08; // Saxo Classic, EU exchanges

// Per-instrument trade fee: minimum fee floor, or the percentage of the per-trade amount if that is larger
// (the minimum binds for small contributions; the percentage binds for large ones).
const perInstrumentTradeFee = (
	numberOfInstruments: number,
	amount: number,
	minFeeCzk: number,
	pct: number,
): number => {
	if (numberOfInstruments <= 0) return 0;
	const amountPerInstrument = amount / numberOfInstruments;
	return numberOfInstruments * Math.max(minFeeCzk, amountPerInstrument * (pct / 100));
};

const platforms: PlatformsConfig = {
	edward: {
		name: "edward",
		color: "#ffcb13",
		logo: "/platforms/edwardinvest.png",
		url: "https://edwardinvest.cz/docs/jake-poplatky-klient-plati/",
		fees: {
			// Entry fee banded 5%→2% by the planned total (June 2026 sazebník), prepaid from the first
			// contributions (advisor may discount). Modeled as fully prepaid (100% of early contributions)
			// until cleared — the exact split is advisor-dependent.
			fixedFee: (plan: PlanConfig, _portfolioValue: number, totalInvested: number) =>
				entryFeePayDown(plan, totalInvested, edwardEntryRate(getPlannedInvestments(plan)), 1),
			percentageFee: 0,
			// Marginal/banded annual management fee (June 2026 sazebník: 1.89% base, down to 0.99%).
			// NOTE: performance fee (0-25% over a high-water mark) is out of model.
			annualPercentageFee: (_plan: PlanConfig, portfolioValue: number) =>
				marginalAnnualRate(portfolioValue, [
					{ upTo: 1000000, rate: 1.89 },
					{ upTo: 5000000, rate: 1.79 },
					{ upTo: 10000000, rate: 1.59 },
					{ upTo: 20000000, rate: 1.29 },
					{ upTo: Infinity, rate: 0.99 },
				]),
			exitFee: 0.4, // forex on liquidation (max 0.4% of exchange volume)
		},
	},
	portu: {
		name: "Portu",
		color: "#00a03c",
		logo: "/platforms/portu.svg",
		url: "https://www.portu.cz/kolik-to-stoji/",
		fees: {
			fixedFee: 0,
			percentageFee: 0,
			annualPercentageFee: (plan: PlanConfig, portfolioValue: number) => {
				// Portu has loyalty discounts on the annual fee for long-term clients
				let sale = 0;
				if (plan.years >= 15) sale = 0.4;
				else if (plan.years >= 10) sale = 0.3;
				else if (plan.years >= 7) sale = 0.25;
				else if (plan.years >= 5) sale = 0.2;

				// Marginal/banded annual fee (June 2026 sazebník): 1.0% base down to 0.4%
				const fee = marginalAnnualRate(portfolioValue, [
					{ upTo: 500000, rate: 1.0 },
					{ upTo: 1000000, rate: 0.8 },
					{ upTo: 5000000, rate: 0.6 },
					{ upTo: Infinity, rate: 0.4 },
				]);

				return fee * (1 - sale);
			},
			exitFee: 0, // all-in fee, no separate currency conversion
		},
	},
	partners: {
		name: "Partners",
		color: "#911eb4",
		logo: "/platforms/partners.png",
		// Actively-managed underlying funds (~1.8% TER, e.g. Dividend Selection 1.78% / 7 Stars 1.82%, 2025)
		// instead of cheap ETFs — overrides the plan-wide TER.
		fundTER: 1.8,
		fees: {
			// Front-loaded entry fee ~4% of total planned contributions ("předplacený poplatek"): 60% of each
			// early contribution pays it down, 40% is invested, until cleared — then later contributions invest free.
			fixedFee: (plan: PlanConfig, _portfolioValue: number, totalInvested: number) =>
				entryFeePayDown(plan, totalInvested, 0.04, 0.6),
			percentageFee: 0,
			// PREMIUM platform fee on portfolio value (Dynamic/Mixed tier); the ~1.8% underlying fund TER is added via platform.fundTER.
			annualPercentageFee: 1,
			exitFee: 0, // CZK-denominated funds, no liquidation conversion
		},
	},
	partnersNew: {
		name: "Partners (no entry)",
		color: "#c77dff",
		logo: "/platforms/partners.png",
		// AVAILABILITY: the current Partners IS / Partners Banka offering for NEW money (2025/2026 marketing) —
		// "entry fees on all our funds are currently zero". Instead an early-redemption (exit) fee applies and is
		// waived after ~5 years held. Same actively-managed funds (~1.8% TER) and ~1% platform fee as `partners`;
		// only the fee TIMING differs (back-loaded exit fee vs the legacy front-loaded prepaid entry fee).
		fundTER: 1.8,
		fees: {
			fixedFee: 0, // no entry fee under the current offering
			percentageFee: 0,
			annualPercentageFee: 1, // same PREMIUM platform fee on portfolio value; ~1.8% fund TER added via platform.fundTER
			// Redemption fee declining 5%→0% over 5 years (free after 60 months held).
			exitFee: partnersExitFee,
		},
	},
	patria: {
		name: "Patria",
		color: "#f59100",
		logo: "/platforms/patria.png",
		url: "https://cdn.patria.cz/Sazebnik-PD.en.pdf",
		fees: {
			fixedFee: 0,
			// 0.8% regular-investment commission + 1.5% currency conversion (CZK base buying foreign ETFs)
			percentageFee: 2.3,
			annualPercentageFee: 0,
			exitFee: 1.5, // currency conversion back to CZK on liquidation
		},
	},
	xtb: {
		name: "xtb",
		color: "#f73e4a",
		logo: "/platforms/xtb.svg",
		url: "https://www.xtb.com/cz/ucet-a-poplatky",
		fees: {
			fixedFee: 0,
			percentageFee: 0.5, // currency conversion
			annualPercentageFee: 0,
			exitFee: 0.5, // currency conversion back to CZK on liquidation
		},
	},
	t212: {
		name: "T212",
		color: "#17becf",
		logo: "/platforms/t212.png",
		url: "https://www.trading212.com/terms/invest",
		fees: {
			fixedFee: 0,
			percentageFee: 0.15, // currency conversion
			annualPercentageFee: 0,
			exitFee: 0.15, // currency conversion back to CZK on liquidation
		},
	},
	ibkr: {
		name: "IBKR API",
		color: "#8c564b",
		logo: "/platforms/ibkr.svg",
		url: "https://www.interactivebrokers.com/en/pricing/commissions-stocks.php",
		fees: {
			// Tiered plan: 0.05% per trade with a EUR 1.25 minimum on EU exchanges (each ETF = 1 trade). The
			// minimum binds for small contributions; the percentage takes over for large ones.
			fixedFee: (plan: PlanConfig, _portfolioValue: number, _totalInvested: number, investment?: number) =>
				perInstrumentTradeFee(
					plan.numberOfInstruments,
					investment ?? plan.monthlyInvestment,
					EUR_TO_CZK * IBKR_MIN_FEE_EUR,
					IBKR_PCT,
				),
			percentageFee: 0.03, // non-manual (auto) currency conversion
			annualPercentageFee: 0,
			exitFee: 0.03, // auto currency conversion back to CZK on liquidation
		},
	},
	saxo: {
		name: "SAXO",
		color: "#003cd2",
		logo: "/platforms/saxo.svg",
		url: "https://www.home.saxo/cs-cz/rates-and-conditions/etf/commissions",
		fees: {
			// Classic account: ~0.08% per trade with a EUR 3 minimum on EU exchanges (each ETF = 1 trade). The
			// minimum binds for small contributions; the percentage takes over for large ones.
			fixedFee: (plan: PlanConfig, _portfolioValue: number, _totalInvested: number, investment?: number) =>
				perInstrumentTradeFee(
					plan.numberOfInstruments,
					investment ?? plan.monthlyInvestment,
					EUR_TO_CZK * SAXO_MIN_FEE_EUR,
					SAXO_PCT,
				),
			percentageFee: 0.25, // currency conversion (Classic FX markup)
			annualPercentageFee: 0,
			exitFee: 0.25, // currency conversion back to CZK on liquidation
		},
	},
	etoro: {
		name: "eToro",
		color: "#bcbd22",
		logo: "/platforms/etoro.svg",
		url: "https://www.etoro.com/trading/fees/",
		fees: {
			fixedFee: 0,
			// CZK conversion on every deposit (no local CZK account; card/bank transfer = 1%). ETF commission is 0%.
			// $5 withdrawal + $10/mo inactivity fees are out of model.
			percentageFee: 1.0,
			annualPercentageFee: 0,
			exitFee: 1.0, // conversion back to CZK on withdrawal (USD-denominated account)
		},
	},
	degiro: {
		name: "Degiro",
		color: "#e377c2",
		logo: "/platforms/degiro.svg",
		url: "https://www.degiro.com/uk/data/pdf/uk/UK_Feeschedule.pdf",
		fees: {
			// Core Selection on Tradegate: EUR 1 handling fee per trade, 0% commission (each ETF = 1 trade).
			// Connectivity fee (EUR 2.50/yr per non-Tradegate exchange) is out of model.
			fixedFee: (plan: PlanConfig) => plan.numberOfInstruments * EUR_TO_CZK * DEGIRO_MIN_FEE_EUR,
			percentageFee: 0.25, // AutoFX conversion (CZK base)
			annualPercentageFee: 0,
			exitFee: 0.25, // AutoFX conversion back to CZK on liquidation
		},
	},
	nofees: {
		name: "0% fees",
		color: "#a9a9a9",
		// theoretical ceiling: no platform fees and no fund TER, just market return + FX
		ignoreFundTER: true,
		fees: {
			fixedFee: 0,
			percentageFee: 0,
			annualPercentageFee: 0,
			exitFee: 0,
		},
	},
};

export default platforms;

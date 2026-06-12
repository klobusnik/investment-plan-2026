import { describe, expect, it } from "vitest";
import { calculatePlatformPlan, entryFeePayDown, getInvestmentAfterFees, marginalAnnualRate } from "./index.ts";
import platforms from "./platforms.ts";
import type { PlanConfig } from "./types.ts";

/**
 * Build a valid PlanConfig with sensible zero-noise defaults so each test can override
 * just the fields it cares about. By default there is NO cash slice (cashWeight = 0) and
 * no volatility/FX/TER/inflation drag, which makes the compounding loop a clean annuity.
 */
const makePlan = (overrides: Partial<PlanConfig> = {}): PlanConfig => ({
	years: 10,
	baseInvestment: 30000,
	monthlyInvestment: 8000,
	averageAnnualReturn: 9.5,
	volatility: 0,
	fxDriftPerYear: 0,
	fundTER: 0,
	inflation: 0,
	numberOfInstruments: 1,
	portfolio: [{ name: "Equity ETF", allocation: 100 }],
	...overrides,
});

describe("calculatePlatformPlan — nofees baseline", () => {
	it("matches the closed-form annuity future value", () => {
		const plan = makePlan({
			averageAnnualReturn: 9.5,
			years: 10,
			baseInvestment: 30000,
			monthlyInvestment: 8000,
		});

		const { portfolioValues } = calculatePlatformPlan(plan, platforms.nofees);

		// Closed form: base compounds for n months, monthly is an ordinary annuity (added end of month).
		const g = (1 + 9.5 / 100) ** (1 / 12);
		const n = plan.years * 12;
		const gPowN = g ** n;
		const expectedFV = plan.baseInvestment * gPowN + plan.monthlyInvestment * ((gPowN - 1) / (g - 1));

		const actual = portfolioValues[n];

		// The engine Math.rounds the portfolio value every month, so per-month rounding error
		// accumulates over 120 months and the early ones keep compounding. Use a relative tolerance
		// of 0.01% of the closed-form FV (a few hundred CZK on a ~2.1M total) to absorb this.
		const tolerance = expectedFV * 0.0001;
		expect(Math.abs(actual - expectedFV)).toBeLessThan(tolerance);
	});
});

describe("marginalAnnualRate", () => {
	it("blends three tiers like tax brackets", () => {
		const tiers = [
			{ upTo: 1000, rate: 1 },
			{ upTo: 2000, rate: 2 },
			{ upTo: Infinity, rate: 3 },
		];

		// value 1500 spans tier 1 (full 1000 @ 1%) and tier 2 (500 @ 2%):
		// fee = 1000*0.01 + 500*0.02 = 20; effective = 20/1500*100 = 1.3333%
		expect(marginalAnnualRate(1500, tiers)).toBeCloseTo(1.3333, 4);
	});
});

describe("getInvestmentAfterFees", () => {
	it("subtracts the percentage fee before the fixed fee", () => {
		// 1000 * 0.99 - 50 = 940
		expect(getInvestmentAfterFees(1000, 1, 50)).toBe(940);
	});
});

describe("entryFeePayDown — Partners-style amortization", () => {
	const entryFeeRate = 0.04;
	const payDownShare = 0.6;
	const plan = makePlan({
		years: 10,
		baseInvestment: 30000,
		monthlyInvestment: 8000,
	});

	it("charges a non-zero fee on the early contributions", () => {
		// month 0 pays from the base investment
		const firstFee = entryFeePayDown(plan, 0, entryFeeRate, payDownShare);
		expect(firstFee).toBeGreaterThan(0);
	});

	it("converges total fee charged to (total planned investment * rate) and then drops to 0", () => {
		const totalPlanned = plan.baseInvestment + plan.monthlyInvestment * plan.years * 12;
		const expectedTotalFee = totalPlanned * entryFeeRate;

		// Simulate the pay-down month by month exactly as the engine does.
		let totalInvested = 0;
		let totalFeeCharged = 0;
		const months = plan.years * 12;

		for (let i = 0; i <= months; i++) {
			const fee = entryFeePayDown(plan, totalInvested, entryFeeRate, payDownShare);
			totalFeeCharged += fee;
			totalInvested += i === 0 ? plan.baseInvestment : plan.monthlyInvestment;
		}

		// The accumulated fee should equal the planned total entry fee (last installment is clamped exactly).
		expect(totalFeeCharged).toBeCloseTo(expectedTotalFee, 5);

		// Once enough has been contributed to pay the fee off, the fee is 0.
		const feeWhenCleared = entryFeePayDown(plan, totalPlanned, entryFeeRate, payDownShare);
		expect(feeWhenCleared).toBe(0);
	});

	it("makes Partners invest less than nofees early on (entry fee drag)", () => {
		const nofeesPlan = calculatePlatformPlan(plan, platforms.nofees);
		const partnersPlan = calculatePlatformPlan(plan, platforms.partners);

		// Index 0 is the base investment after entry fees — Partners pays the entry fee, nofees does not.
		expect(partnersPlan.portfolioValues[0]).toBeLessThan(nofeesPlan.portfolioValues[0]);
	});
});

describe("partnersNew — current 0%-entry / declining exit-fee variant", () => {
	// A lump sum with zero return isolates the exit-fee schedule from contribution timing and growth.
	const plan = makePlan({ baseInvestment: 500000, monthlyInvestment: 0, years: 7, averageAnnualReturn: 0 });
	const { portfolioValues } = calculatePlatformPlan(plan, platforms.partnersNew);

	it("charges no entry fee but a 5% redemption fee at t=0", () => {
		// month 0 has no annual fee applied yet, so it is purely the base minus the 5% exit fee
		expect(portfolioValues[0]).toBe(Math.round(500000 * 0.95));
	});

	it("steps the exit fee down at each year boundary (net jumps up despite ongoing fee drag)", () => {
		expect(portfolioValues[12]).toBeGreaterThan(portfolioValues[11]); // 5% -> 4%
		expect(portfolioValues[60]).toBeGreaterThan(portfolioValues[59]); // 1% -> 0%
	});

	it("waives the exit fee after 5 years held", () => {
		// with zero return the gross value only shrinks from the platform + TER fees, so once the exit fee is
		// gone the net must fall month over month — there are no more upward exit-fee steps.
		expect(portfolioValues[72]).toBeLessThan(portfolioValues[60]);
	});
});

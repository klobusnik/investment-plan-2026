import type { CalculatedPlatformPlan, PlanConfig, PlatformConfig, DynamicFee } from "./types.ts";

// ČNB central bank reference rates, 11 June 2026
export const USD_TO_CZK = 20.98;
export const EUR_TO_CZK = 24.2;

export interface FeeTier {
	/** Upper bound (inclusive) of this band's portfolio value; use Infinity for the top band. */
	upTo: number;
	/** Annual fee percentage charged on the portion of the portfolio that falls inside this band. */
	rate: number;
}

/**
 * Marginal tiered annual fee: each band of the portfolio value is charged its own rate,
 * like tax brackets (this is how Edward and Portu actually bill).
 *
 * Returns the EFFECTIVE annual percentage for the whole portfolio so it plugs straight into
 * the existing `annualPercentageFee` lever without any engine change.
 */
export const marginalAnnualRate = (portfolioValue: number, tiers: FeeTier[]): number => {
	// below the first band there is nothing to bill marginally; fall back to the base rate
	if (portfolioValue <= 0) return tiers[0].rate;

	let lowerBound = 0;
	let feeAmount = 0;

	for (const tier of tiers) {
		const upperBound = Math.min(portfolioValue, tier.upTo);
		if (upperBound > lowerBound) {
			feeAmount += (upperBound - lowerBound) * (tier.rate / 100);
			lowerBound = upperBound;
		}
		if (portfolioValue <= tier.upTo) break;
	}

	return (feeAmount / portfolioValue) * 100;
};

/** Total amount the plan intends to contribute over its life: base plus every planned monthly contribution. */
export const getPlannedInvestments = (plan: PlanConfig): number =>
	plan.baseInvestment + plan.monthlyInvestment * plan.years * 12;

/**
 * Front-loaded entry fee that is gradually paid off from the first contributions, after which later
 * contributions are invested fee-free. Used by Partners (60% pay-down) and Edward (fully prepaid).
 *
 * @param entryFeeRate fraction of total planned investment charged as the entry fee (e.g. 0.04 = 4%)
 * @param payDownShare fraction of each early contribution that goes toward the fee (e.g. 0.6 = 60%)
 */
export const entryFeePayDown = (
	plan: PlanConfig,
	totalInvested: number,
	entryFeeRate: number,
	payDownShare: number,
): number => {
	const totalEntryFee = getPlannedInvestments(plan) * entryFeeRate;
	const remaining = totalEntryFee - totalInvested * payDownShare;

	if (remaining <= 0) return 0;

	// month 0 pays from the base investment, later months from each monthly contribution
	const contribution = totalInvested > 0 ? plan.monthlyInvestment : plan.baseInvestment;

	return Math.min(remaining, contribution * payDownShare);
};

export const calculatePercentageFeeWithFixedMinimum = (
	plan: PlanConfig,
	percentageFee: number,
	minimumFee: number,
	investment?: number,
) => {
	if (plan.numberOfInstruments) return plan.numberOfInstruments * minimumFee;

	// plan percentage fee is subtracted first, we need to simulate it here (usually a currency conversion)
	const investedAmount = investment ?? plan.monthlyInvestment;

	let totalFees = 0;
	for (const instrument of plan.portfolio) {
		// no fees for cash reserve
		if (instrument.isCash) continue;

		const amount = investedAmount * (instrument.allocation / 100);
		const fee = amount * (percentageFee / 100);

		totalFees += Math.max(minimumFee, fee);
	}

	return totalFees;
};

/**
 * Calculate the investment after percentage and fixed fees.
 * @note Percentage fee is subtracted first.
 */
export const getInvestmentAfterFees = (investment: number, percentageFee: number, fixedFee: number) => {
	return investment * (1 - percentageFee / 100) - fixedFee;
};

export const calculatePlatformPlan = (plan: PlanConfig, platform: PlatformConfig): CalculatedPlatformPlan => {
	// defining the functions here for ease of parameter passing
	/**
	 * Get the dynamic fee.
	 */
	const getFee = (
		func: number | DynamicFee,
		portfolioValue: number,
		totalInvested: number,
		investment?: number,
		monthIndex?: number,
	): number => {
		if (typeof func === "function") {
			return func(plan, portfolioValue, totalInvested, investment, monthIndex);
		}

		return func;
	};

	/**
	 * Calculate the actual investment after fees.
	 */
	const getPlanInvestmentAfterFees = (investment: number, portfolioValue: number, totalInvested: number) => {
		const fixedFee = getFee(platform.fees.fixedFee, portfolioValue, totalInvested, investment);
		const percentageFee = getFee(platform.fees.percentageFee, portfolioValue, totalInvested, investment);

		return getInvestmentAfterFees(investment, percentageFee, fixedFee);
	};

	/**
	 * Calculate the portfolio value after the annual management fee and the fund TER.
	 */
	const getPortfolioValueAfterFees = (portfolioValue: number, totalInvested: number) => {
		// platform.fundTER overrides the plan-wide TER (managed funds cost more than plain ETFs); baseline opts out
		const fundTER = platform.ignoreFundTER ? 0 : (platform.fundTER ?? plan.fundTER);
		const annualPercentageFee =
			(getFee(platform.fees.annualPercentageFee, portfolioValue, totalInvested) + fundTER) / 100;
		const monthlyPercentageFee = annualPercentageFee / 12;

		return portfolioValue * (1 - monthlyPercentageFee);
	};

	// begin calculation...

	// Volatility drag: a volatile series realises ~σ²/2 less than its arithmetic mean each year.
	const volatilityDrag = plan.volatility ** 2 / 200;
	// The cash slice of the portfolio earns ~0%, not the equity return — blend it out of the effective return.
	const totalAllocation = plan.portfolio.reduce((sum, item) => sum + item.allocation, 0) || 100;
	const cashWeight =
		plan.portfolio.filter((item) => item.isCash).reduce((sum, item) => sum + item.allocation, 0) / totalAllocation;
	const effectiveAssetAnnual = (plan.averageAnnualReturn - volatilityDrag) * (1 - cashWeight);

	// realized CZK growth = asset return (after drag + cash blend, in fund currency) blended with the FX drift vs CZK
	const averageMonthlyReturn = (1 + effectiveAssetAnnual / 100) ** (1 / 12);
	const fxMonthlyChange = (1 + plan.fxDriftPerYear / 100) ** (1 / 12);
	const effectiveMonthlyReturn = averageMonthlyReturn * fxMonthlyChange;

	// month "0" is the base investment
	const totalInvested = [getFee(plan.baseInvestment, 0, 0)];
	const portfolioValues = [getPlanInvestmentAfterFees(plan.baseInvestment, 0, 0)];

	for (let i = 0; i < plan.years * 12; i++) {
		const investment = getPlanInvestmentAfterFees(plan.monthlyInvestment, portfolioValues[i], totalInvested[i]);

		const portfolioValue =
			getPortfolioValueAfterFees(portfolioValues[i] * effectiveMonthlyReturn, totalInvested[i]) + investment;

		totalInvested.push(Math.round(totalInvested[i] + plan.monthlyInvestment));
		portfolioValues.push(Math.round(portfolioValue));
	}

	// each plotted point is the net CZK you'd walk away with if you liquidated then (sell-side FX applied)
	const netOfExit = portfolioValues.map((value, i) => {
		const exitFee = getFee(platform.fees.exitFee ?? 0, value, totalInvested[i], undefined, i);
		return Math.round(value * (1 - exitFee / 100));
	});

	return {
		plan,
		platform,
		portfolioValues: netOfExit,
		investedValues: totalInvested,
	};
};

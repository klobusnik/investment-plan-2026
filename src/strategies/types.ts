export type DynamicFee = (
	plan: PlanConfig,
	portfolioValue: number,
	totalInvested: number,
	/** The contribution currently being invested (monthly or base); lets per-trade fees scale with amount. */
	investment?: number,
	/** Months elapsed since the plan started; only supplied to the exit-fee closure, so a redemption fee can decline with holding time. */
	monthIndex?: number,
) => number;

export interface PlanConfigPortfolio {
	name: string;
	allocation: number;
	isCash?: boolean;
}

export interface PlanConfig {
	years: number;
	baseInvestment: number;
	monthlyInvestment: number;
	/** Expected average annual return of the assets in their own (fund) currency, e.g. USD/EUR. Treated as an
	 * arithmetic mean — volatility drag and FX are applied separately. */
	averageAnnualReturn: number;
	/** Expected annual volatility (std dev) of returns; applies the geometric volatility drag (g ≈ r − σ²/2). */
	volatility: number;
	/** Expected annual change of the portfolio's (blended foreign) currency vs CZK. Positive = foreign currency strengthens. */
	fxDriftPerYear: number;
	/** Average annual fund cost (TER) of the held ETFs; applied to every real platform on top of its own fees. */
	fundTER: number;
	/** Expected annual inflation, used only for the optional real-terms ("today's money") display. */
	inflation: number;
	numberOfInstruments: number;
	portfolio: PlanConfigPortfolio[];
}

export interface PlatformConfig {
	name: string;
	color: string;
	logo?: string;
	url?: string;
	/** Skip the plan-level fund TER (used by the theoretical 0%-fees baseline so it stays a pure ceiling). */
	ignoreFundTER?: boolean;
	/** Override the plan-wide fund TER, e.g. managed products whose underlying funds cost more than plain ETFs. */
	fundTER?: number;
	fees: {
		fixedFee: number | DynamicFee;
		// usually currency conversion fees
		percentageFee: number | DynamicFee;
		annualPercentageFee: number | DynamicFee;
		/** One-time sell-side currency conversion charged when liquidating the portfolio back to CZK. */
		exitFee?: number | DynamicFee;
	};
}

export interface CalculatedPlatformPlan {
	plan: PlanConfig;
	platform: PlatformConfig;
	portfolioValues: number[];
	investedValues: number[];
}

export type PlatformsConfig = Record<string, PlatformConfig>;

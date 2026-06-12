import { InputNumber, Row, Col, Slider, Form, Tooltip, Layout, Switch } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import Chart from "./components/Chart.tsx";
import { useMemo, useRef, useState } from "react";
import type { PlanConfig, CalculatedPlatformPlan } from "./strategies/types.ts";
import { calculatePlatformPlan } from "./strategies";
import platforms from "./strategies/platforms.ts";
import Footer from "./components/Footer.tsx";
import Header from "./components/Header.tsx";
import PlatformFees from "./components/PlatformFees.tsx";
import CheckpointTable from "./components/CheckpointTable.tsx";
import Concepts from "./components/Concepts.tsx";

function App() {
	const calculatedPlans = useRef<CalculatedPlatformPlan[]>([]);
	const [plan, setPlan] = useState<PlanConfig>({
		years: 14,
		baseInvestment: 30000,
		monthlyInvestment: 8000,
		averageAnnualReturn: 9.5,
		volatility: 15,
		fxDriftPerYear: 0,
		fundTER: 0.2,
		inflation: 2.5,
		numberOfInstruments: 11,
		portfolio: [
			{
				name: "S&P 500",
				allocation: 21,
			},
			{
				name: "Nasdaq 100",
				allocation: 10,
			},
			{
				name: "Wide Moat",
				allocation: 9,
			},
			{
				name: "USA Small Cap",
				allocation: 4,
			},
			{
				name: "iShares Europe",
				allocation: 15,
			},
			{
				name: "Pacific ex-Japan",
				allocation: 3,
			},
			{
				name: "Xtrackers Japan",
				allocation: 6,
			},
			{
				name: "Amundi Asia",
				allocation: 5,
			},
			{
				name: "World Small Cap",
				allocation: 10,
			},
			{
				name: "Vanguard All-World",
				allocation: 5,
			},
			{
				name: "iShares EM IMI",
				allocation: 10,
			},
			{
				name: "Cash reserve",
				allocation: 2,
				isCash: true,
			},
		],
	});
	const [currency] = useState<string>("Kč");
	const [showReal, setShowReal] = useState<boolean>(false);

	const noPortfolio = plan.numberOfInstruments === 0;
	const totalAllocation = plan.portfolio.reduce((acc, item) => acc + item.allocation, 0);

	const calculatedPlatformPlans = useMemo(() => {
		if (noPortfolio && totalAllocation !== 100) return calculatedPlans.current;

		const plans: CalculatedPlatformPlan[] = [];
		for (const platform in platforms) {
			const calculated = calculatePlatformPlan(plan, platforms[platform]);

			plans.push(calculated);
		}

		return plans;
	}, [plan, totalAllocation, noPortfolio]);

	// const setPortfolio = (portfolio: PlanConfigPortfolio[]) => {
	// 	setPlan((prevPlan) => ({ ...prevPlan, portfolio }));
	// };
	//
	// const setNumberOfInstruments = (numberOfInstruments: number) => {
	// 	setPlan((prevPlan) => ({ ...prevPlan, numberOfInstruments }));
	// };

	const handleInputChange = (key: keyof PlanConfig, value: number) => {
		setPlan((prevPlan) => ({ ...prevPlan, [key]: value }));
	};

	return (
		<Layout className="max-w-screen-xl mx-auto bg-white px-3">
			<Header />

			<Layout.Content>
				<h1 className="text-3xl mb-2 font-bold text-center">Investment Growth Over {plan.years} Years</h1>
				<p className="text-center text-gray-400 mb-8 text-sm">
					{showReal ? `In today's money (real terms, ${plan.inflation}% inflation)` : "In future CZK (nominal)"}
				</p>

				<Chart data={calculatedPlatformPlans} currency={currency} inflation={plan.inflation} showReal={showReal} />

				<Form layout="vertical" className="mt-8">
					<Row>
						<Col xs={24} md={12}>
							<Form.Item
								label={
									<span>
										Base Investment{" "}
										<Tooltip title="The one-time investment of your already saved money.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={0}
									step={1000}
									value={plan.baseInvestment}
									onChange={(value) => value != null && handleInputChange("baseInvestment", value)}
									addonAfter={currency}
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Monthly Investment{" "}
										<Tooltip title="The amount of money you plan to invest each month.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={0}
									step={100}
									value={plan.monthlyInvestment}
									onChange={(value) => value != null && handleInputChange("monthlyInvestment", value)}
									addonAfter={currency}
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Average Annual Return{" "}
										<Tooltip title="Expected average (arithmetic) annual return of your assets in their own (fund) currency, e.g. USD/EUR. Volatility drag and currency moves against the koruna are applied separately below.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={0}
									max={100}
									step={0.1}
									value={plan.averageAnnualReturn}
									onChange={(value) => value != null && handleInputChange("averageAnnualReturn", value)}
									addonAfter="% p.a."
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Expected volatility{" "}
										<Tooltip title="Annual volatility (standard deviation) of returns. A volatile series compounds to roughly σ²/2 per year below its average (the 'volatility drag'), so a higher value lowers the realistic projection. ~15% is typical for a diversified equity portfolio; set 0 to project the raw average.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={0}
									max={100}
									step={1}
									value={plan.volatility}
									onChange={(value) => value != null && handleInputChange("volatility", value)}
									addonAfter="% σ"
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Expected FX change (foreign currency vs CZK){" "}
										<Tooltip title="Annual change of your assets' currency (USD/EUR) against the koruna. Positive = USD/EUR strengthen, raising your CZK value; negative = the koruna strengthens, lowering it. Historically the koruna has appreciated long-term, so a conservative value is slightly negative.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={-20}
									max={20}
									step={0.1}
									value={plan.fxDriftPerYear}
									onChange={(value) => value != null && handleInputChange("fxDriftPerYear", value)}
									addonAfter="% p.a."
								/>
							</Form.Item>
						</Col>
						<Col xs={24} lg={12}>
							<Form.Item
								label={
									<span>
										Years investing{" "}
										<Tooltip title="The number of years you plan to invest. This also affects Portu fees.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<Row>
									<Col span={12}>
										<Slider
											min={1}
											max={50}
											onChange={(value) => value != null && handleInputChange("years", value)}
											value={plan.years}
										/>
									</Col>
									<Col span={4}>
										<InputNumber
											min={1}
											max={50}
											value={plan.years}
											onChange={(value) => value != null && handleInputChange("years", value)}
										/>
									</Col>
								</Row>
							</Form.Item>
							{/*<Form.Item*/}
							{/*	label={*/}
							{/*		<span>*/}
							{/*			Currency{" "}*/}
							{/*			<Tooltip title="Currency used for the visualization (does not affect calculations).">*/}
							{/*				<QuestionCircleOutlined />*/}
							{/*			</Tooltip>*/}
							{/*		</span>*/}
							{/*	}*/}
							{/*>*/}
							{/*	<Col span={2}>*/}
							{/*		<Input value={currency} onChange={(event) => setCurrency(event.target.value)} />*/}
							{/*	</Col>*/}
							{/*</Form.Item>*/}
							<Form.Item
								label={
									<span>
										Number of financial instruments in your portfolio{" "}
										<Tooltip title="The number of financial instruments you plan to have in your portfolio (e.g., number of ETFs) can impact your costs. Some brokers, such as IBKR, SAXO, and Degiro, charge a fixed minimum fee for each trade (as each instrument requires a separate trade). This affects the overall fixed fees.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={1}
									step={1}
									value={plan.numberOfInstruments}
									onChange={(value) => value != null && handleInputChange("numberOfInstruments", value)}
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Fund cost / TER{" "}
										<Tooltip title="Average annual expense ratio (TER) of the ETFs you hold. Charged inside the funds by the provider, on top of any platform fee, so it applies to all platforms equally.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={0}
									max={5}
									step={0.05}
									value={plan.fundTER}
									onChange={(value) => value != null && handleInputChange("fundTER", value)}
									addonAfter="% p.a."
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Annual inflation{" "}
										<Tooltip title="Used only for the 'today's money' view below — it deflates future CZK to current purchasing power. It does not change the comparison between platforms.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<InputNumber
									min={0}
									max={100}
									step={0.1}
									value={plan.inflation}
									onChange={(value) => value != null && handleInputChange("inflation", value)}
									addonAfter="% p.a."
								/>
							</Form.Item>
							<Form.Item
								label={
									<span>
										Show in today's money{" "}
										<Tooltip title="Show all values in today's purchasing power (real terms) by deflating each point at the inflation rate above, instead of nominal future CZK.">
											<QuestionCircleOutlined />
										</Tooltip>
									</span>
								}
							>
								<Switch checked={showReal} onChange={setShowReal} />
							</Form.Item>
						</Col>
					</Row>
				</Form>

				{/*<Portfolio*/}
				{/*	portfolio={plan.portfolio}*/}
				{/*	setPortfolio={setPortfolio}*/}
				{/*	numberOfInstruments={plan.numberOfInstruments}*/}
				{/*	setNumberOfInstruments={setNumberOfInstruments}*/}
				{/*/>*/}

				<CheckpointTable
					data={calculatedPlatformPlans}
					currency={currency}
					inflation={plan.inflation}
					showReal={showReal}
				/>

				<PlatformFees currency={currency} />

				<Concepts />

				<div className="mt-10 text-xs text-gray-400 leading-relaxed">
					<p className="font-semibold mb-1">What this projection includes — and what it doesn't</p>
					<p>
						<span className="font-medium">Included:</span> platform fees (entry, per-trade, percentage and annual), fund
						TER, currency conversion on both buy and sell, and an assumed exchange-rate drift. All values are in CZK;
						exchange rates are ČNB reference rates from June 2026.
					</p>
					<p>
						<span className="font-medium">Not included:</span> taxes, performance fees (e.g. Edward), inactivity and
						withdrawal fees, card-deposit fees, bid/ask spreads, and exchange connectivity fees. Fee schedules reflect
						public sources as of June 2026 and may change.
					</p>
				</div>

				<div className="mt-8 mb-4 text-center">
					<a
						href={`${import.meta.env.BASE_URL}investment-platforms-2026.html`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 font-medium"
					>
						📄 Full guide: Czech investing platforms, fees, taxes &amp; short-term parking (2026)
					</a>
				</div>
			</Layout.Content>
			<Footer />
		</Layout>
	);
}

export default App;

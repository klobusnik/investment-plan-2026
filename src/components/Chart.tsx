import { Line } from "react-chartjs-2";
import { CalculatedPlatformPlan } from "../strategies/types";

export interface ChartProps {
	currency: string;
	data: CalculatedPlatformPlan[];
	inflation?: number;
	showReal?: boolean;
}

export default function Chart({ currency, data, inflation = 0, showReal = false }: ChartProps) {
	if (!data.length) return null;

	// Deflate each monthly point to today's purchasing power when the real-terms view is on
	const toDisplay = (values: number[]) =>
		showReal && inflation ? values.map((v, i) => Math.round(v / (1 + inflation / 100) ** (i / 12))) : values;

	// Create year/month labels
	const labels = [
		"Today",
		...Array.from({ length: data[0].plan.years * 12 }, (_, i) => `Year ${Math.floor(i / 12)} Month ${(i % 12) + 1}`),
	];

	const datasets = data.map((plan) => ({
		label: plan.platform.name,
		data: toDisplay(plan.portfolioValues),
		borderColor: plan.platform.color,
		backgroundColor: `${plan.platform.color}70`,
	}));

	return (
		<div
			style={{
				width: "100%",
				height: "40rem",
			}}
		>
			<Line
				data={{
					labels,
					datasets: [
						...datasets,
						{
							label: "Invested Amount",
							data: toDisplay(data[0].investedValues),
							borderColor: "#d0d0d0",
							backgroundColor: "#d0d0d070",
							borderDash: [5, 5],
						},
					],
				}}
				options={{
					maintainAspectRatio: false,
					animation: false,
					interaction: {
						intersect: false,
						mode: "index",
					},
					elements: {
						point: {
							radius: 0,
						},
					},
					scales: {
						x: {
							ticks: {
								callback: (_, index: number) => {
									// Show only the years on the X axis
									if (index % 12 === 0) {
										return `Year ${index / 12}`;
									}
									return "";
								},
							},
						},
						y: {
							ticks: {
								callback: (value: number | string) => `${value.toLocaleString()} ${currency}`,
							},
						},
					},
					plugins: {
						legend: {
							position: "bottom",
						},
						tooltip: {
							itemSort: (a, b) => b.parsed.y - a.parsed.y,
							callbacks: {
								label: (context) => {
									const label = context.dataset.label;
									const value = context.parsed.y as number;

									return `${label}: ${value.toLocaleString()} ${currency}`;
								},
							},
						},
						zoom: {
							zoom: {
								drag: {
									enabled: true,
								},
								wheel: {
									enabled: true,
								},
								pinch: {
									enabled: true,
								},
								mode: "x",
							},
						},
					},
				}}
			/>
		</div>
	);
}

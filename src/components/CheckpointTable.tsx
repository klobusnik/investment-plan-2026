import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CalculatedPlatformPlan } from "../strategies/types.ts";

export interface CheckpointTableProps {
	data: CalculatedPlatformPlan[];
	currency: string;
	inflation?: number;
	showReal?: boolean;
}

interface CheckpointRow {
	key: string;
	name: string;
	color?: string;
	isReference?: boolean;
	values: number[];
}

// Round to 1 decimal and drop a trailing ".0" so 5.0 → "5" but 3.5 → "3.5"
const formatYearLabel = (years: number) => `${Math.round(years * 10) / 10}`;

export default function CheckpointTable({ data, currency, inflation = 0, showReal = false }: CheckpointTableProps) {
	if (!data.length) return null;

	const totalMonths = data[0].plan.years * 12;

	// Deflate a single point to today's purchasing power when the real-terms view is on (same logic as Chart)
	const toDisplay = (value: number, monthIndex: number) =>
		showReal && inflation ? Math.round(value / (1 + inflation / 100) ** (monthIndex / 12)) : value;

	const checkpoints = [1, 2, 3, 4].map((k) => {
		const monthIndex = Math.min(Math.round((totalMonths * k) / 4), totalMonths);
		const yearLabel = formatYearLabel((data[0].plan.years * k) / 4);
		return { monthIndex, yearLabel };
	});

	const valuesAt = (series: number[]) =>
		checkpoints.map(({ monthIndex }) => toDisplay(series[Math.min(monthIndex, series.length - 1)] ?? 0, monthIndex));

	const platformRows: CheckpointRow[] = data
		.map((plan) => ({
			key: plan.platform.name,
			name: plan.platform.name,
			color: plan.platform.color,
			values: valuesAt(plan.portfolioValues),
		}))
		// Best performer (highest final-checkpoint value) on top
		.sort((a, b) => b.values[b.values.length - 1] - a.values[a.values.length - 1]);

	const investedRow: CheckpointRow = {
		key: "__invested__",
		name: "Invested",
		isReference: true,
		values: valuesAt(data[0].investedValues),
	};

	const rows = [...platformRows, investedRow];

	const columns: ColumnsType<CheckpointRow> = [
		{
			title: "Platform",
			dataIndex: "name",
			key: "name",
			fixed: "left",
			render: (name: string, row) => (
				<span className={row.isReference ? "font-semibold text-gray-500" : "font-medium"}>
					{row.color && (
						<span
							className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
							style={{ backgroundColor: row.color }}
						/>
					)}
					{name}
				</span>
			),
		},
		...checkpoints.map(({ yearLabel }, i) => ({
			title: `${yearLabel} yr`,
			dataIndex: ["values", i],
			key: `cp-${i}`,
			align: "right" as const,
			render: (_: unknown, row: CheckpointRow) => (
				<span className={row.isReference ? "text-gray-500" : undefined}>
					{row.values[i].toLocaleString()} {currency}
				</span>
			),
		})),
	];

	return (
		<div className="mt-14">
			<h2 className="text-2xl font-bold mb-4">Projected value at a glance</h2>
			<p className="text-sm text-gray-400 mb-4">
				Net value you'd walk away with at each point, after fees and exit/FX —{" "}
				{showReal ? "in today's money" : "in nominal future CZK"}.
			</p>
			<Table
				columns={columns}
				dataSource={rows}
				pagination={false}
				size="middle"
				scroll={{ x: 640 }}
				rowClassName={(row) => (row.isReference ? "bg-gray-50" : "")}
			/>
		</div>
	);
}

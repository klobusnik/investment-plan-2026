import { Collapse, Table } from "antd";
import type { CollapseProps } from "antd";

const fundsItems: CollapseProps["items"] = [
	{
		key: "etf",
		label: "What is an ETF?",
		children: (
			<p>
				A single thing you buy like a share on an exchange that holds hundreds or thousands of companies at once. Buy
				one ETF and you instantly own a tiny slice of everything inside it — no stock-picking needed. Example: buy one
				share of a "world" ETF for ~3,000 CZK and you own a sliver of Apple, Microsoft, Nestlé and ~1,500 other firms.
			</p>
		),
	},
	{
		key: "index-active",
		label: "Index fund vs active fund",
		children: (
			<p>
				An <strong>index fund</strong> just copies a published list (an index) — no manager picking stocks, so fees are
				tiny. An <strong>active fund</strong> pays a manager to try to beat the market. Over the long run, low-cost
				index funds beat most active funds <em>after fees</em>.
			</p>
		),
	},
	{
		key: "acc-dist",
		label: "Accumulating vs distributing (important for Czechs)",
		children: (
			<p>
				<strong>Distributing</strong> pays dividends to you as cash. <strong>Accumulating</strong> reinvests them inside
				the fund automatically. For Czech investors <strong>accumulating is usually better</strong>: no dividend payout
				means nothing to declare or tax each year — you only deal with tax when you sell, and after 3 years that sale is
				tax-free.
			</p>
		),
	},
	{
		key: "ter",
		label: "TER (expense ratio)",
		children: (
			<p>
				The fund's yearly running cost, taken automatically from its value (you never get a bill). Broad index ETF ≈
				0.07–0.22%/yr; active bank fund ≈ 1.5–2.5%. Example: 0.20% TER on 500,000 CZK = ~1,000 CZK/year, quietly
				deducted.
			</p>
		),
	},
	{
		key: "indexes",
		label: "S&P 500 vs MSCI World vs FTSE All-World",
		children: (
			<p>
				These are <strong>indexes</strong> (the lists ETFs copy). <strong>S&P 500</strong> = 500 biggest US firms
				(US-only, tech-heavy). <strong>MSCI World</strong> = ~1,400 firms across 23 developed countries (no emerging
				markets). <strong>FTSE All-World</strong> = ~3,700 firms, developed + emerging — the broadest one-fund choice.
			</p>
		),
	},
	{
		key: "where",
		label: "Where you buy: broker vs robo vs bank fund vs advisor",
		children: (
			<p>
				<strong>Broker</strong> (XTB, IBKR, DEGIRO, Fio): you pick and buy yourself — cheapest.{" "}
				<strong>Robo-advisor</strong> (Portu, Fondee): answer a questionnaire, it builds & auto-manages a portfolio —
				convenient, ~0.5–1%/yr. <strong>Bank fund</strong>: easy to start but usually worst value (high TER + entry
				fee). <strong>Advisor-led</strong> (Edward, Partners): personal advice but often big up-front + ongoing fees —
				read the fee sheet carefully.
			</p>
		),
	},
];

const feesItems: CollapseProps["items"] = [
	{
		key: "fee-types",
		label: "The fee types, one line each",
		children: (
			<p>
				<strong>Entry / front-load:</strong> one-time cut when you pay in (3% on 500k = 15,000 CZK gone).{" "}
				<strong>Annual management:</strong> yearly % a robo/manager charges. <strong>Fund TER:</strong> the fund's own
				internal cost (stacks on top of management). <strong>FX / conversion:</strong> spread taken converting
				CZK↔USD/EUR, each way. <strong>Exit:</strong> cut when you sell. <strong>Per-trade commission:</strong> fixed/%
				per order — hurts small frequent buys. <strong>Inactivity:</strong> charged if you don't trade.{" "}
				<strong>Custody:</strong> small yearly fee just to hold assets. <strong>Spread:</strong> invisible gap between
				buy/sell price.
			</p>
		),
	},
	{
		key: "fee-impact",
		label: "Why 1% vs 0.2% is a huge deal",
		children: (
			<p>
				A fee doesn't cost you "1%" — it compounds against you every year. Over 30 years an extra ~0.8%/yr quietly eats
				roughly <strong>a fifth of your final pot</strong>. This is why TER is the single most important number to
				minimise.
			</p>
		),
	},
];

const growthItems: CollapseProps["items"] = [
	{
		key: "compounding",
		label: "Compounding",
		children: (
			<p>
				Your returns start earning their own returns. 500,000 CZK at 7% → 535,000 next year; then 7% is earned on
				535,000, not 500,000. A small head-start snowballs enormously over decades.
			</p>
		),
	},
	{
		key: "return-vol",
		label: "Expected return & volatility",
		children: (
			<p>
				<strong>Expected return</strong> is a realistic long-run average (~6–8%/yr nominal for global stocks), not a
				promise — single years swing from −40% to +30%. <strong>Volatility</strong> = how violently the value bounces.
				Stocks are volatile; savings accounts are not.
			</p>
		),
	},
	{
		key: "vol-drag",
		label: "Volatility drag",
		children: (
			<p>
				Losses hurt more than equal gains help (−50% needs +100% to recover). So bumpy returns compound to <em>less</em>{" "}
				than the simple average. Rough rule: real growth ≈ average − (volatility² ÷ 2).
			</p>
		),
	},
	{
		key: "risk-horizon",
		label: "Risk vs time horizon & diversification",
		children: (
			<p>
				The longer you can leave money untouched, the more stock risk you can take — you can ride out crashes. Money
				needed in 1–2 years should take almost no risk. <strong>Diversification</strong> (a broad ETF spreads across
				thousands of firms) means one bankruptcy barely dents you.
			</p>
		),
	},
	{
		key: "dca",
		label: "Regular investing (DCA) vs lump sum",
		children: (
			<p>
				<strong>Dollar-cost averaging</strong> = invest a fixed amount monthly, smoothing the price you pay and removing
				"did I buy at the top?" stress. <strong>Lump sum</strong> = invest it all at once; statistically wins more often
				(markets rise more than fall). With 500,000 CZK/year, ~42,000 CZK/month is a sensible default.
			</p>
		),
	},
];

const inflationItems: CollapseProps["items"] = [
	{
		key: "real-nominal",
		label: "Real vs nominal return (inflation)",
		children: (
			<p>
				<strong>Nominal</strong> = the headline number; <strong>real</strong> = after inflation (actual purchasing
				power). Czech inflation peaked &gt;15% in 2022–23 and has since cooled toward ČNB's ~2% target. 6% nominal −
				2.5% inflation ≈ 3.5% real. Cash earning less than inflation is silently losing value.
			</p>
		),
	},
	{
		key: "fx-drift",
		label: "Currency risk & FX drift for a CZK investor",
		children: (
			<p>
				Your salary is CZK but a world ETF holds USD/EUR assets. If CZK strengthens, your CZK value drops even if the
				ETF rose in dollars. <strong>FX drift</strong> is the slow long-term trend (if CZK tends to strengthen, that's a
				mild headwind). Over decades it mostly washes out but adds short-term wobble.
			</p>
		),
	},
	{
		key: "hedged",
		label: "CZK-hedged ETFs",
		children: (
			<p>
				Versions that cancel out currency moves so you get the market return without the CZK/USD wobble. They cost a bit
				more (higher TER) and the hedge isn't free; most long-term investors skip hedging on equities and accept the
				noise.
			</p>
		),
	},
	{
		key: "dividend-tax",
		label: "Dividend tax & W-8BEN",
		children: (
			<p>
				The US withholds 15% on dividends to foreigners — but 30% if you haven't filed a <strong>W-8BEN</strong> form.
				Crucially, with an <strong>Irish ETF the fund handles this for you</strong> (only 15% internally), so you
				usually don't file W-8BEN yourself.
			</p>
		),
	},
	{
		key: "domicile",
		label: "Fund domicile: Irish (IE00) vs US — prefer Irish",
		children: (
			<p>
				Where the fund is registered. <strong>Irish UCITS (ISIN IE00…)</strong> beats US-domiciled for Czechs: only 15%
				internal US dividend tax (vs 30%), accumulating versions need no yearly declaration, and no US estate-tax
				exposure above ~$60k. Most US-domiciled ETFs aren't even legally sellable to EU retail anyway.{" "}
				<strong>Rule of thumb: prefer IE00.</strong>
			</p>
		),
	},
	{
		key: "liquidity",
		label: "Liquidity & the emergency fund",
		children: (
			<p>
				<strong>Liquidity</strong> = how fast you can turn it into cash without loss. Keep an{" "}
				<strong>emergency fund</strong> of ~3–6 months' expenses in instant-access cash before investing. Never put
				money you'll need within ~2–3 years into stocks.
			</p>
		),
	},
];

const taxItems: CollapseProps["items"] = [
	{
		key: "time-test",
		label: "Time test — 3 years → 0% tax",
		children: (
			<p>
				Hold securities (shares, ETFs, fund units) <strong>≥ 3 years</strong> → capital gain is <strong>exempt</strong>{" "}
				from income tax. (Company ownership stakes: 5 years.) The cornerstone of tax-efficient investing.{" "}
				<strong>Still in force 2026.</strong>
			</p>
		),
	},
	{
		key: "value-test",
		label: "Value test — 100,000 CZK",
		children: (
			<p>
				If your <strong>total gross proceeds</strong> from selling securities in a year are{" "}
				<strong>≤ 100,000 CZK</strong>, it's exempt <em>regardless</em> of holding period. Note: gross sale proceeds,
				not profit. Threshold unchanged for 2025/26.
			</p>
		),
	},
	{
		key: "40m-cap",
		label: "The 40M cap — gone (2026)",
		children: (
			<p>
				A 40,000,000 CZK/yr cap on the time-test exemption was added in <strong>2025</strong>, then{" "}
				<strong>removed for securities from 1 Jan 2026</strong> (kept only for crypto). Irrelevant unless you sell
				&gt;40M in a year.
			</p>
		),
	},
	{
		key: "rates",
		label: "Tax rates — 15% / 23%",
		children: (
			<p>
				Taxable gains and dividends are added to your income: <strong>15%</strong> up to ~1.68M CZK total,{" "}
				<strong>23%</strong> above. Most investors pay 15% on anything taxable.
			</p>
		),
	},
	{
		key: "dip-break",
		label: "DIP — how the tax break works",
		children: (
			<p>
				Deduct your own DIP contributions from your tax base up to <strong>48,000 CZK/year</strong> → saves up to{" "}
				<strong>7,200 CZK</strong> (15% × 48,000). This 48k cap is <strong>shared</strong> across DIP + pension
				(penzijko) + life insurance — it's one combined ceiling, not per product. An employer can add up to{" "}
				<strong>50,000 CZK/year</strong> free of income tax and social/health insurance (a separate shared limit that
				doesn't eat into your own 48k deduction).
			</p>
		),
	},
	{
		key: "dip-lockup",
		label: "DIP — the lock-up (read before signing)",
		children: (
			<p>
				To keep the benefit you must hold{" "}
				<strong>at least 10 years AND withdraw no earlier than the year you turn 60</strong> — both conditions. Break it
				(withdraw even 1 CZK early) and you must{" "}
				<strong>repay all the tax relief claimed over the last 10 years</strong>.
			</p>
		),
	},
	{
		key: "dip-who",
		label: "DIP — what qualifies & who offers it",
		children: (
			<p>
				Broad: shares, ETFs, bonds, fund units, and cash held inside the DIP. Offered by banks, brokers and investment
				companies — incl. <strong>Patria (best-rated), Portu, Fondee, Fio, Conseq, Česká spořitelna, MONETA</strong>.
				Among low-cost foreign DIY brokers: <strong>XTB yes; Trading 212, DEGIRO, IBKR, eToro, Revolut: no.</strong>{" "}
				Only ~48k of your annual contribution gets the deduction and DIP money is locked to age 60, so use DIP for the
				slice you're certain you won't touch before retirement; invest the rest in a normal brokerage account where the
				3-year time test already makes gains tax-free with full flexibility.
			</p>
		),
	},
	{
		key: "reporting",
		label: "Reporting foreign ETF gains/dividends (DIY)",
		children: (
			<p>
				No automatic Czech withholding on a foreign broker — you self-report. <strong>Capital gains:</strong> §10
				(nothing owed if time/value test passes). <strong>Dividends:</strong> §8 gross at 15%, with foreign tax often
				creditable via treaty. <strong>Currency:</strong> convert each transaction at the ČNB rate on the trade date, or
				use the single annual rate — pick one method and stick to it. Accumulating Irish ETFs held 3+ years often mean{" "}
				<strong>zero tax paperwork</strong>.
			</p>
		),
	},
];

interface ShortTermRow {
	key: string;
	option: string;
	rate: string;
	net: string;
	liquidity: string;
	protected: string;
	catch: string;
}

const shortTermRows: ShortTermRow[] = [
	{
		key: "state-bond",
		option: "🏆 State bond — Dluhopis Republiky (Flexi)",
		rate: "3.5% (resets to repo if higher)",
		net: "3.5% — tax-free",
		liquidity: "Rolls every 3 months",
		protected: "State-backed",
		catch:
			"Subscription windows only; buy via ČSOB / Česká spořitelna. Interest exempt from the 15% tax — beats a 4% savings account that nets ~3.4%.",
	},
	{
		key: "savings",
		option: "High-yield savings account (spořicí účet)",
		rate: "~3.5–4.2% gross (top, often promo)",
		net: "~3.0–3.6% (15% tax withheld)",
		liquidity: "Instant / next-day",
		protected: "Yes — €100,000",
		catch: "Top 'bonus' rates are time-limited (3–6 mo), may need card use/salary, often capped at ~500k balance.",
	},
	{
		key: "term-deposit",
		option: "Term deposit (termínovaný vklad)",
		rate: "~3.5% (12m), ~3.75% (24m)",
		net: "~3.0–3.2%",
		liquidity: "Locked for the term",
		protected: "Yes — €100,000",
		catch: "Money locked; breaking early usually forfeits interest. Good for the part you're sure you won't touch.",
	},
	{
		key: "money-market",
		option: "Money-market / 'rezerva' fund (e.g. Portu Investiční rezerva)",
		rate: "~3.2% gross (− 0.25% fee)",
		net: "~2.5%",
		liquidity: "A few business days",
		protected: "Cash sleeve insured €100k",
		catch: "Slower access than savings; use the cautious cash variant, not a bond/mixed one, for 1–2 yr money.",
	},
	{
		key: "bond-etf",
		option: "Short-term CZK bond ETF / gov-bond fund",
		rate: "~3–4% yield",
		net: "Taxable if sold <3 yr",
		liquidity: "Same-day (exchange)",
		protected: "Not deposit-insured",
		catch: "Price can dip if rates rise; for a beginner the tax-free state bond is simpler.",
	},
	{
		key: "equity-etf",
		option: "❌ Equity / world ETF",
		rate: "~7% long-run avg",
		net: "Taxable + volatile",
		liquidity: "Same-day",
		protected: "Not deposit-insured",
		catch: "Wrong tool for 1–2 years — see warning below.",
	},
];

const shortTermColumns = [
	{ title: "Option", dataIndex: "option", key: "option" },
	{ title: "Indicative rate (2026)", dataIndex: "rate", key: "rate" },
	{ title: "Net after tax", dataIndex: "net", key: "net" },
	{ title: "Liquidity", dataIndex: "liquidity", key: "liquidity" },
	{ title: "Protected?", dataIndex: "protected", key: "protected" },
	{ title: "The catch", dataIndex: "catch", key: "catch" },
];

const shortTermItems: CollapseProps["items"] = [
	{
		key: "why-not-equities",
		label: "Why equity ETFs are the wrong tool for 1–2 years",
		children: (
			<p>
				<strong>1. Volatility:</strong> stocks can fall 20–40% in months — a real chance you'd sell at a loss exactly
				when you need the cash. <strong>2. Tax:</strong> selling under 3 years misses the time test, so the gain is
				taxable at 15% (your 500k easily blows past the 100k value test). Short-term equity gains are both risky{" "}
				<em>and</em> taxed.
			</p>
		),
	},
	{
		key: "parking-options",
		label: "Where to park money instead (comparison)",
		children: (
			<Table
				columns={shortTermColumns}
				dataSource={shortTermRows}
				pagination={false}
				size="small"
				scroll={{ x: 720 }}
			/>
		),
	},
	{
		key: "simple-plan",
		label: "The simple plan for 500k over 1–2 years",
		children: (
			<p>
				Split by when you'll need each chunk: the <strong>tax-free Dluhopis Republiky Flexi bond (3.5%)</strong> for the
				bulk you can leave 3+ months at a time, a <strong>top savings account (~4% gross / instant access)</strong> for
				the part you might need any day, and a <strong>12-month term deposit (~3.5%)</strong> for money you definitely
				won't touch for a year. Interest from savings/deposits has 15% tax auto-deducted by the bank (no reporting); the
				state bond's interest is fully tax-free.
			</p>
		),
	},
];

const groups = [
	{ title: "Funds & ETFs", items: fundsItems },
	{ title: "Fees & how they eat returns", items: feesItems },
	{ title: "Growth, risk & behaviour", items: growthItems },
	{ title: "Inflation, currency & dividends", items: inflationItems },
	{ title: "Czech tax & DIP", items: taxItems },
	{ title: "Short-term (1–2 years)", items: shortTermItems },
];

export default function Concepts() {
	return (
		<div className="mt-14">
			<h2 className="text-2xl font-bold mb-4">Understanding the concepts</h2>
			{groups.map((group) => (
				<div className="mb-6" key={group.title}>
					<h3 className="text-base font-semibold uppercase tracking-wide text-gray-500 mb-2">{group.title}</h3>
					<Collapse items={group.items} />
				</div>
			))}
			<p className="mt-4 text-xs text-gray-400">
				Educational summary only — not tax or investment advice. Fees, rates and tax rules change; verify with each
				provider and a tax professional before acting.
			</p>
		</div>
	);
}

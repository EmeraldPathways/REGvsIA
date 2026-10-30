import { useEffect, useMemo, useState } from "react";
import {
  DIRT_RATE,
  IA_ANNUAL_CONTRIBUTION_LIMIT,
  IA_TAX_FREE_THRESHOLD,
  IA_TAX_RATE,
  projectBankSavings,
  projectInvestmentAccount,
  type Inputs,
  type ScenarioResult,
} from "./calculations";

const money = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const defaults: Inputs = {
  openingAmount: 0,
  monthlyContribution: 500,
  years: 10,
  bankAer: 2,
  bankAnnualFee: 0,
  bankExitFee: 0,
  investmentReturn: 5,
  investmentAnnualCharge: 0,
  investmentExitCharge: 0,
  investmentExitFee: 0,
};

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        {prefix ? <span className="field-affix">{prefix}</span> : null}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span className="field-affix suffix">{suffix}</span> : null}
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function Metric({
  title,
  value,
  detail,
  highlight = false,
}: {
  title: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <article className={highlight ? "metric metric-highlight" : "metric"}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ScenarioCard({
  title,
  subtitle,
  result,
  accent,
}: {
  title: string;
  subtitle: string;
  result: ScenarioResult;
  accent?: boolean;
}) {
  return (
    <article className={accent ? "scenario-card scenario-investment" : "scenario-card"}>
      <div className="scenario-title">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h3>{title}</h3>
        </div>
        <span className="scenario-mark" aria-hidden="true">{accent ? "IA" : "€"}</span>
      </div>
      <strong className="scenario-total">{money.format(result.endingBalance)}</strong>
      <span className="scenario-total-label">estimated value after taxes and entered charges</span>
      <dl className="scenario-breakdown">
        <div><dt>Total contributions</dt><dd>{money.format(result.totalContributions)}</dd></div>
        <div><dt>Interest / investment growth</dt><dd>{money.format(result.totalGrowth)}</dd></div>
        <div><dt>Tax paid in illustration</dt><dd>{money.format(result.totalTax)}</dd></div>
        <div><dt>Annual and exit charges entered</dt><dd>{money.format(result.totalAnnualFees)}</dd></div>
      </dl>
    </article>
  );
}

function buildPath(values: number[], maximum: number) {
  if (!values.length) return "";
  const width = 720;
  const height = 230;
  const paddingX = 14;
  const paddingY = 14;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  return values.map((value, index) => {
    const x = paddingX + (values.length === 1 ? 0 : (index / (values.length - 1)) * plotWidth);
    const y = height - paddingY - (maximum > 0 ? (Math.max(0, value) / maximum) * plotHeight : 0);
    return (index === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ");
}

function ResultsChart({
  bank,
  investment,
}: {
  bank: ScenarioResult;
  investment: ScenarioResult;
}) {
  const bankValues = [0, ...bank.yearly.map((row) => row.balance)];
  const investmentValues = [0, ...investment.yearly.map((row) => row.balance)];
  const maximum = Math.max(...bankValues, ...investmentValues, 1);
  const bankPath = buildPath(bankValues, maximum);
  const investmentPath = buildPath(investmentValues, maximum);

  return (
    <div className="chart-frame">
      <div className="chart-heading">
        <div><p className="eyebrow">Projection</p><h3>How the balances may change</h3></div>
        <span>Illustrative only</span>
      </div>
      <svg className="chart" viewBox="0 0 720 230" role="img" aria-label="Illustrative comparison of projected balances over time">
        {[0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = 216 - (202 * fraction);
          return <line key={fraction} x1="14" x2="706" y1={y} y2={y} className="gridline" />;
        })}
        <path d={bankPath} className="line-bank" />
        <path d={investmentPath} className="line-investment" />
      </svg>
      <div className="chart-legend">
        <span><i className="dot-bank" />Regular savings account</span>
        <span><i className="dot-investment" />Irish Investment Account</span>
      </div>
    </div>
  );
}

function ResultsTable({
  bank,
  investment,
}: {
  bank: ScenarioResult;
  investment: ScenarioResult;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Regular savings</th>
            <th scope="col">DIRT paid</th>
            <th scope="col">Investment Account</th>
            <th scope="col">IA tax paid</th>
          </tr>
        </thead>
        <tbody>
          {bank.yearly.map((row, index) => {
            const ia = investment.yearly[index];
            return (
              <tr key={row.year}>
                <th scope="row">{row.year}</th>
                <td>{money.format(row.balance)}</td>
                <td>{money.format(row.tax - (bank.yearly[index - 1]?.tax ?? 0))}</td>
                <td>{money.format(ia.balance)}</td>
                <td>{money.format(ia.tax - (investment.yearly[index - 1]?.tax ?? 0))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(defaults);
  const embedMode = new URLSearchParams(window.location.search).get("embed") === "1";
  const bank = useMemo(() => projectBankSavings(inputs), [inputs]);
  const investment = useMemo(() => projectInvestmentAccount(inputs), [inputs]);
  const difference = investment.endingBalance - bank.endingBalance;
  const differenceLabel = difference >= 0 ? "higher in this illustration" : "lower in this illustration";

  const update = (key: keyof Inputs, value: number) => {
    setInputs((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  };

  useEffect(() => {
    document.body.classList.toggle("embed-mode", embedMode);
    if (!embedMode || window.parent === window) return;
    const parentOrigin = document.referrer ? new URL(document.referrer).origin : "*";
    const reportHeight = () => {
      window.parent.postMessage({
        type: "REGVSIA_EMBED_RESIZE",
        height: document.documentElement.scrollHeight,
      }, parentOrigin);
    };
    const observer = new ResizeObserver(reportHeight);
    observer.observe(document.documentElement);
    reportHeight();
    return () => {
      observer.disconnect();
      document.body.classList.remove("embed-mode");
    };
  }, [embedMode]);

  return (
    <main className={embedMode ? "app app-embedded" : "app"}>
      <header className="hero-banner">
        <a className="brand" href="https://www.omegafinancial.ie/" aria-label="Omega Financial Management home">
          <img className="brand-logo" src="/omega-financial-logo-white.png" alt="Omega Financial Management" />
        </a>
        <div className="hero-copy">
          <p className="eyebrow">Irish savings comparison</p>
          <h1>Regular savings or the new Investment Account?</h1>
          <p className="intro-copy">Compare your own savings assumptions, taxes and charges side by side. Change the figures to match the account and provider you are considering.</p>
        </div>
        <aside className="launch-badge">
          <span className="badge-dot" />
          <div><small>Expected from</small><strong>1 July 2027</strong></div>
        </aside>
      </header>

      <section className="disclosure">
        <strong>First, a useful distinction</strong>
        <p>The Irish Investment Account is a Government initiative, but it is <b>not</b> a Government savings scheme. It holds investments, not guaranteed cash savings; its value can fall and you could get back less than you put in.</p>
      </section>

      <div className="calculator-layout">
        <section className="input-card" aria-labelledby="assumptions-title">
          <div className="card-heading">
            <div><p className="eyebrow">Your assumptions</p><h2 id="assumptions-title">Set up the comparison</h2></div>
            <span className="heading-icon" aria-hidden="true">↗</span>
          </div>

          <div className="form-grid">
            <Field label="Starting amount" value={inputs.openingAmount} onChange={(value) => update("openingAmount", Math.max(0, value))} prefix="€" step={100} hint="For the Investment Account, this counts toward its first-year contribution limit." />
            <Field label="Monthly saving" value={inputs.monthlyContribution} onChange={(value) => update("monthlyContribution", Math.max(0, value))} prefix="€" step={25} />
            <Field label="Years saving" value={inputs.years} onChange={(value) => update("years", Math.max(1, Math.min(40, Math.round(value))))} suffix="years" min={1} max={40} />
          </div>

          <details className="assumptions" open>
            <summary>Regular savings account assumptions <span aria-hidden="true">⌄</span></summary>
            <div className="form-grid">
              <Field label="Gross interest rate (AER)" value={inputs.bankAer} onChange={(value) => update("bankAer", Math.max(-99.9, Math.min(100, value)))} suffix="%" step={0.1} min={-99.9} max={100} hint="Rates and balance limits depend on the bank. Replace the illustrative 2.00% with your chosen account's current AER." />
              <Field label="Annual account charges" value={inputs.bankAnnualFee} onChange={(value) => update("bankAnnualFee", Math.max(0, value))} prefix="€" step={1} hint="Use the bank's fee schedule; €0 is an editable starting assumption." />
              <Field label="End / closure charge" value={inputs.bankExitFee} onChange={(value) => update("bankExitFee", Math.max(0, value))} prefix="€" step={1} hint="Enter a fee if your chosen account has one." />
            </div>
            <div className="tax-chip"><span>DIRT assumed</span><strong>{(DIRT_RATE * 100).toFixed(0)}%</strong><small>deducted from positive deposit interest</small></div>
          </details>

          <details className="assumptions">
            <summary>Investment Account assumptions <span aria-hidden="true">⌄</span></summary>
            <div className="form-grid">
              <Field label="Assumed gross annual investment return" value={inputs.investmentReturn} onChange={(value) => update("investmentReturn", Math.max(-99.9, Math.min(100, value)))} suffix="%" step={0.1} min={-99.9} max={100} hint="An assumption only. Investment values can fall as well as rise." />
              <Field label="Annual provider / fund charge" value={inputs.investmentAnnualCharge} onChange={(value) => update("investmentAnnualCharge", Math.max(0, Math.min(100, value)))} suffix="%" step={0.05} min={0} max={100} hint="Enter the actual charge from the provider. Zurich's page notes charges apply but does not publish this account's rate." />
              <Field label="End value charge" value={inputs.investmentExitCharge} onChange={(value) => update("investmentExitCharge", Math.max(0, Math.min(100, value)))} suffix="%" step={0.05} min={0} max={100} hint="Enter any withdrawal or exit percentage charge if applicable." />
              <Field label="Fixed end / withdrawal fee" value={inputs.investmentExitFee} onChange={(value) => update("investmentExitFee", Math.max(0, value))} prefix="€" step={1} hint="Enter any fixed fee if applicable." />
            </div>
            <div className="tax-chip"><span>Announced annual tax</span><strong>{(IA_TAX_RATE * 100).toFixed(0)}% above €{IA_TAX_FREE_THRESHOLD.toLocaleString("en-IE")}</strong><small>calculated on average value; provider is expected to handle it</small></div>
          </details>

          <p className="limit-note">The Investment Account has a proposed annual contribution limit of {money.format(IA_ANNUAL_CONTRIBUTION_LIMIT)} per person. Contributions above that limit are excluded from its projection.</p>
        </section>

        <section className="results-panel" aria-labelledby="results-title">
          <div className="results-topline"><span id="results-title">Your illustration</span><span>{inputs.years} year{inputs.years === 1 ? "" : "s"}</span></div>
          <div className="difference-card">
            <div>
              <p className="eyebrow">Difference at the end</p>
              <strong>{money.format(Math.abs(difference))}</strong>
              <span>{differenceLabel} based on the assumptions entered</span>
            </div>
            <span className="difference-arrow" aria-hidden="true">{difference >= 0 ? "↗" : "↘"}</span>
          </div>

          <div className="scenario-grid">
            <ScenarioCard title="Regular savings account" subtitle="Cash deposit" result={bank} />
            <ScenarioCard title="Irish Investment Account" subtitle="Investments" result={investment} accent />
          </div>

          {investment.excludedContributions > 0 ? (
            <div className="limit-warning" role="status">
              {money.format(investment.excludedContributions)} of the requested contributions were above the Investment Account's annual limit and were not included. The regular savings illustration includes the full amount.
            </div>
          ) : null}

          <ResultsChart bank={bank} investment={investment} />
          <ResultsTable bank={bank} investment={investment} />
        </section>
      </div>

      <section className="notes">
        <div><p className="eyebrow">How to read this</p><h2>What the calculator includes</h2></div>
        <div className="notes-grid">
          <article><strong>Bank savings</strong><p>Models a fixed AER, monthly deposits, annual DIRT on positive interest, and the annual and closing charges you enter. Actual bank rates, interest crediting, caps and fees vary by product.</p></article>
          <article><strong>Investment Account</strong><p>Models a monthly investment return, annual provider charge, annual tax on average value above €50,000, and the exit fees you enter. It applies the €12,000 contribution cap separately in each projection year.</p></article>
          <article><strong>Timing and risk</strong><p>This illustration treats each projection year as a full 12 months and assumes the Investment Account is available for the whole projection. The Government expects providers to offer accounts from 1 July 2027, subject to the final rules and provider terms.</p></article>
        </div>
        <div className="source-links">
          <a href="https://www.zurich.ie/savings-and-investments/savings-options/investment-account/" target="_blank" rel="noreferrer">Zurich Investment Account details ↗</a>
          <a href="https://www.ccpc.ie/manage-your-money/saving-and-investments/new-investment-account" target="_blank" rel="noreferrer">CCPC guide to the new account ↗</a>
          <a href="https://www.revenue.ie/en/additional-incomes/dirt/what-dirt-rate-is-applicable.aspx" target="_blank" rel="noreferrer">Revenue: current DIRT rate ↗</a>
          <a href="https://www.ccpc.ie/manage-your-money/saving-and-investments/compare-savings-accounts/" target="_blank" rel="noreferrer">CCPC: comparing savings accounts and fees ↗</a>
        </div>
      </section>

      <footer>
        <p><strong>Important information</strong></p>
        <p>This tool provides an educational estimate, not personal financial advice, a product quotation or a recommendation. Actual returns, charges, access terms and tax treatment may differ. Investment values can fall, and you may receive less than you invest. The Investment Account rules and provider charges may change before launch. Check the final legislation and product terms before acting.</p>
      </footer>
    </main>
  );
}

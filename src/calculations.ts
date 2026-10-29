export const DIRT_RATE = 0.33;
export const IA_TAX_RATE = 0.01;
export const IA_TAX_FREE_THRESHOLD = 50_000;
export const IA_ANNUAL_CONTRIBUTION_LIMIT = 12_000;

export type Inputs = {
  openingAmount: number;
  monthlyContribution: number;
  years: number;
  bankAer: number;
  bankAnnualFee: number;
  bankExitFee: number;
  investmentReturn: number;
  investmentAnnualCharge: number;
  investmentExitCharge: number;
  investmentExitFee: number;
};

export type YearResult = {
  year: number;
  contributions: number;
  interestOrGrowth: number;
  tax: number;
  annualFees: number;
  balance: number;
};

export type ScenarioResult = {
  totalContributions: number;
  totalGrowth: number;
  totalTax: number;
  totalAnnualFees: number;
  exitCharge: number;
  endingBalance: number;
  excludedContributions: number;
  yearly: YearResult[];
};

const safeRate = (percent: number) => Math.max(-99.9, Math.min(100, percent)) / 100;
const monthlyEffectiveRate = (annualRate: number) => Math.pow(1 + annualRate, 1 / 12) - 1;
const nonNegative = (amount: number) => Math.max(0, Number.isFinite(amount) ? amount : 0);

export function projectBankSavings(input: Inputs): ScenarioResult {
  const years = Math.max(1, Math.min(40, Math.round(input.years)));
  const monthly = nonNegative(input.monthlyContribution);
  const opening = nonNegative(input.openingAmount);
  const rate = monthlyEffectiveRate(safeRate(input.bankAer));
  const annualFee = nonNegative(input.bankAnnualFee);
  const exitFee = nonNegative(input.bankExitFee);
  let balance = opening;
  let totalContributions = opening;
  let totalGrowth = 0;
  let totalTax = 0;
  let totalAnnualFees = 0;
  const yearly: YearResult[] = [];

  for (let year = 1; year <= years; year += 1) {
    const balanceAtStart = balance;
    let contributions = 0;
    let interest = 0;

    for (let month = 0; month < 12; month += 1) {
      balance += monthly;
      contributions += monthly;
      const monthInterest = balance * rate;
      balance += monthInterest;
      interest += monthInterest;
    }

    const tax = Math.max(0, interest) * DIRT_RATE;
    const fee = Math.min(balance, annualFee);
    balance = Math.max(0, balance - tax - fee);
    totalContributions += contributions;
    totalGrowth += interest;
    totalTax += tax;
    totalAnnualFees += fee;

    yearly.push({
      year,
      contributions: totalContributions,
      interestOrGrowth: totalGrowth,
      tax: totalTax,
      annualFees: totalAnnualFees,
      balance,
    });
  }

  const closingFee = Math.min(balance, exitFee);
  balance = Math.max(0, balance - closingFee);
  if (yearly.length) yearly[yearly.length - 1].balance = balance;

  return {
    totalContributions,
    totalGrowth,
    totalTax,
    totalAnnualFees: totalAnnualFees + closingFee,
    exitCharge: closingFee,
    endingBalance: balance,
    excludedContributions: 0,
    yearly,
  };
}

export function projectInvestmentAccount(input: Inputs): ScenarioResult {
  const years = Math.max(1, Math.min(40, Math.round(input.years)));
  const monthly = nonNegative(input.monthlyContribution);
  const openingRequested = nonNegative(input.openingAmount);
  const opening = Math.min(openingRequested, IA_ANNUAL_CONTRIBUTION_LIMIT);
  const openingExcluded = openingRequested - opening;
  const grossMonthlyRate = monthlyEffectiveRate(safeRate(input.investmentReturn));
  const annualChargeRate = Math.min(100, nonNegative(input.investmentAnnualCharge)) / 100;
  const exitRate = Math.min(100, nonNegative(input.investmentExitCharge)) / 100;
  const exitFeeInput = nonNegative(input.investmentExitFee);
  let balance = opening;
  let totalContributions = opening;
  let totalGrowth = 0;
  let totalTax = 0;
  let totalAnnualFees = 0;
  let excludedContributions = openingExcluded;
  const yearly: YearResult[] = [];

  for (let year = 1; year <= years; year += 1) {
    const balanceAtStart = balance;
    let contributedThisYear = year === 1 ? opening : 0;
    let contributions = 0;
    let growth = 0;

    for (let month = 0; month < 12; month += 1) {
      const remainingAllowance = Math.max(0, IA_ANNUAL_CONTRIBUTION_LIMIT - contributedThisYear);
      const deposit = Math.min(monthly, remainingAllowance);
      const excluded = monthly - deposit;
      balance += deposit;
      contributedThisYear += deposit;
      contributions += deposit;
      excludedContributions += excluded;

      const monthGrowth = balance * grossMonthlyRate;
      balance += monthGrowth;
      growth += monthGrowth;
    }

    const averageBeforeCharge = Math.max(0, (balanceAtStart + balance) / 2);
    const annualFee = Math.min(balance, averageBeforeCharge * annualChargeRate);
    const afterCharge = Math.max(0, balance - annualFee);
    const averageForTax = Math.max(0, (balanceAtStart + afterCharge) / 2);
    const tax = Math.max(0, averageForTax - IA_TAX_FREE_THRESHOLD) * IA_TAX_RATE;
    balance = Math.max(0, afterCharge - tax);

    totalContributions += contributions;
    totalGrowth += growth;
    totalTax += tax;
    totalAnnualFees += annualFee;

    yearly.push({
      year,
      contributions: totalContributions,
      interestOrGrowth: totalGrowth,
      tax: totalTax,
      annualFees: totalAnnualFees,
      balance,
    });
  }

  const percentageExitCharge = balance * exitRate;
  const exitCharge = Math.min(balance, percentageExitCharge + exitFeeInput);
  balance = Math.max(0, balance - exitCharge);
  if (yearly.length) yearly[yearly.length - 1].balance = balance;

  return {
    totalContributions,
    totalGrowth,
    totalTax,
    totalAnnualFees: totalAnnualFees + exitCharge,
    exitCharge,
    endingBalance: balance,
    excludedContributions,
    yearly,
  };
}

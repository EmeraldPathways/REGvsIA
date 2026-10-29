# Regular Savings vs Investment Account Calculator

A browser-only calculator that compares an Irish bank savings illustration with the proposed Irish Investment Account. It is based on the OmegaCalculator project layout and is tailored to this comparison.

## Important product distinction

The Irish Investment Account is a Government initiative, but it is **not** a Government savings scheme and does not guarantee capital or returns. Providers are expected to offer it from 1 July 2027. The account is for eligible investments, not a cash savings balance.

## Current assumptions in this illustration

- Irish resident DIRT on Irish deposit interest: 33%, applied annually to positive interest in this model.
- Investment Account: €12,000 contribution limit per person per year; 1% annual tax on average account value above €50,000, using an average opening/closing balance approximation.
- No deemed disposal under the announced Investment Account rules.
- The Zurich landing page does not state the Zurich Investment Account's product/fund charges or any exit charge. The calculator therefore starts these inputs at 0%; users should replace them with the provider's published terms when available.
- Bank savings rates, caps and fees vary. The editable 2.00% default is an illustration, not a market-wide rate. Any bank annual or closure fees can be entered separately.
- Investment growth is uncertain and can be negative. Results are estimates only and are not financial advice.

## Development

```sh
npm install
npm run dev
npm run build
```

The app keeps all inputs in the browser and does not save or transmit them.

## Sources (checked 29 October 2026)

- Zurich, [Investment Account](https://www.zurich.ie/savings-and-investments/savings-options/investment-account/)
- CCPC, [Ireland's new Investment Account](https://www.ccpc.ie/manage-your-money/saving-and-investments/new-investment-account)
- Revenue, [DIRT rate](https://www.revenue.ie/en/additional-incomes/dirt/what-dirt-rate-is-applicable.aspx)
- CCPC, [Savings account comparison and charges](https://www.ccpc.ie/manage-your-money/saving-and-investments/compare-savings-accounts/)
- PTSB, [Online Regular Saver](https://www.ptsb.ie/saving-and-investing/savings-accounts/online-regular-saver/)

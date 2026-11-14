export interface Market {
  id: string;
  name: string;
  currency: string;
  locale: string;
  minorUnits: number;
  minAmountMinor: number;
  limits: { perTransactionMinor: number; dailyMinor: number };
  phoneHint: string;
  settlementLabel: string;
}

const major = (value: number, minorUnits: number) => Math.round(value * 10 ** minorUnits);

function market(
  id: string,
  name: string,
  currency: string,
  locale: string,
  minorUnits: number,
  perTx: number,
  daily: number,
  phoneHint: string,
  settlementLabel: string,
): Market {
  return {
    id,
    name,
    currency,
    locale,
    minorUnits,
    minAmountMinor: major(1, minorUnits),
    limits: { perTransactionMinor: major(perTx, minorUnits), dailyMinor: major(daily, minorUnits) },
    phoneHint,
    settlementLabel,
  };
}

export const markets: Record<string, Market> = {
  "pilot-usd": market("pilot-usd", "Pilot region A", "USD", "en-US", 2, 250, 1000, "+1 555 010 0142", "Bank account (routing + account)"),
  "pilot-eur": market("pilot-eur", "Pilot region B", "EUR", "en-IE", 2, 200, 800, "+353 85 010 0142", "Bank account (IBAN)"),
  "pilot-jpy": market("pilot-jpy", "Pilot region C", "JPY", "ja-JP", 0, 30000, 100000, "+81 90 0100 0142", "Bank account (branch + account)"),
};

export const defaultMarketId = "pilot-usd";
export const marketList = Object.values(markets);
export const getMarket = (id: string | undefined): Market => markets[id ?? ""] ?? markets[defaultMarketId];

export const consentVersion = "2026-10-v1";
export const DEMO_MODE = true;
export const demoCode = "424242";
export const demoPassword = "demo-pass-1";

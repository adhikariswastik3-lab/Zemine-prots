import type { FundingSource } from "@/domain/types";

export const WALLET_ID = "wallet";
export const MAX_METHODS = 3;
export const RANKS = ["Primary", "Secondary", "Third"] as const;

export interface PayMethod {
  id: string;
  kind: "wallet" | "bank" | "card";
  label: string;
  detail: string;
}

/** Every method a customer could pay with: the Zemine wallet plus connected banks and cards. */
export function allMethods(sources: FundingSource[]): PayMethod[] {
  return [
    { id: WALLET_ID, kind: "wallet", label: "Zemine wallet", detail: "Balance" },
    ...sources.map((s): PayMethod => ({ id: s.id, kind: s.kind, label: s.label, detail: `·· ${s.last4}` })),
  ];
}

/** Resolves the customer's saved payment order, dropping removed sources and falling back to a sensible default. */
export function resolveOrder(order: string[] | undefined, sources: FundingSource[]): PayMethod[] {
  const all = allMethods(sources);
  const ids = order ?? [WALLET_ID, ...sources.map((s) => s.id)];
  const seen = new Set<string>();
  const picked: PayMethod[] = [];
  for (const id of ids) {
    const m = all.find((x) => x.id === id);
    if (m && !seen.has(id) && picked.length < MAX_METHODS) {
      seen.add(id);
      picked.push(m);
    }
  }
  return picked;
}

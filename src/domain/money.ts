import type { Market } from "@/config/markets";

export const major = (value: number, market: Market) => Math.round(value * 10 ** market.minorUnits);

export function formatMoney(minor: number, market: Market, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(minor) / 10 ** market.minorUnits;
  const body = new Intl.NumberFormat(market.locale, {
    style: "currency",
    currency: market.currency,
    minimumFractionDigits: market.minorUnits,
    maximumFractionDigits: market.minorUnits,
  }).format(abs);
  if (minor < 0) return `− ${body}`;
  return opts.signed && minor > 0 ? `+ ${body}` : body;
}

export function formatCompact(minor: number, market: Market): string {
  return new Intl.NumberFormat(market.locale, {
    style: "currency",
    currency: market.currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minor / 10 ** market.minorUnits);
}

export function digitsToMinor(digits: string): number {
  const n = Number(digits || "0");
  return Number.isFinite(n) ? n : 0;
}

export function formatDateTime(iso: string, market: Market): string {
  return new Intl.DateTimeFormat(market.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatRelativeDay(iso: string, market: Market): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat(market.locale, { timeStyle: "short" }).format(d);
  if (sameDay) return `Today, ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return new Intl.DateTimeFormat(market.locale, { month: "short", day: "numeric" }).format(d);
}

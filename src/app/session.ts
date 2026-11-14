import { getMarket } from "@/config/markets";
import { useDb } from "@/services/mock/db";

export function useSession() {
  const db = useDb();
  const market = getMarket(db.marketId);
  return { db, user: db.user, market };
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "Z";

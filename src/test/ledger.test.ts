import { describe, expect, it } from "vitest";
import { isDateInPeriod, saleCost } from "@/lib/ledger";
import type { Row } from "@/lib/store";

describe("Ledger summaries", () => {
  it("uses the unit-cost snapshot saved with a sale", () => {
    const sale: Row = { id: "s1", product: "Tea", qty: 3, unitCost: 125 };
    expect(saleCost(sale, [{ id: "p1", name: "Tea", cost: 999 }], [])).toBe(375);
  });

  it("filters dates by day, month, year, and all-time period", () => {
    expect(isDateInPeriod("2026-11-19", "day", "2026-11-19")).toBe(true);
    expect(isDateInPeriod("2026-11-02", "month", "2026-11")).toBe(true);
    expect(isDateInPeriod("2025-11-19", "year", "2025")).toBe(true);
    expect(isDateInPeriod("2024-01-01", "all", "")).toBe(true);
    expect(isDateInPeriod("2026-11-20", "day", "2026-11-19")).toBe(false);
  });
});

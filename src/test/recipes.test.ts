import { describe, it, expect } from "vitest";
import { recipeCost, reconcileSales, saleProfit, saleTotal, saveSales } from "@/lib/recipes";
import { parseBackup, staffProjection, TABLE_KEYS } from "@/lib/offline-access";
import type { Row } from "@/lib/store";

const stock: [Row, Row] = [
  { id: "rice", name: "Rice", unit: "kg", qty: 10, unitCost: 100 },
  { id: "oil", name: "Oil", unit: "litre", qty: 5, unitCost: 200 },
];
const products: [Row] = [
  {
    id: "meal",
    name: "Meal",
    price: 500,
    cost: 999,
    recipe: JSON.stringify([
      { stockId: "rice", qty: 0.25 },
      { stockId: "oil", qty: 0.5 },
    ]),
  },
];
function first(rows: Row[]): Row {
  const row = rows[0];
  if (!row) throw new Error("Expected sale");
  return row;
}
const sale: Row = { id: "sale", product: "Meal", qty: 2, price: 500, customer: "Customer" };
describe("Per-serving recipes", () => {
  it("calculates the total amount due and rejects invalid quantities or prices", () => {
    expect(saleTotal(3, 500)).toBe(1500);
    expect(saleTotal("", 500)).toBeNull();
    expect(saleTotal(3, "")).toBeNull();
    expect(saleTotal(-1, 500)).toBeNull();
    expect(saleTotal(3, -500)).toBeNull();
  });
  it("accepts 0.25 and 0.5 quantities and calculates 125 per serving", () => {
    expect(recipeCost(products[0], stock)).toBe(125);
  });
  it("deducts each ingredient per serving sold", () => {
    const r = reconcileSales([], [sale], products, stock);
    expect(r.stock.map((s) => s["qty"])).toEqual([9.5, 4]);
  });
  it("uses the calculated cost rather than the manually entered cost for profit", () => {
    const r = reconcileSales([], [sale], products, stock);
    expect(saleProfit(first(r.sales), products, stock)).toBe(750);
  });
  it("adjusts inventory on quantity edit", () => {
    const r = reconcileSales([], [sale], products, stock);
    const edit = reconcileSales(r.sales, [{ ...first(r.sales), qty: 3 }], products, r.stock);
    expect(edit.stock.map((s) => s["qty"])).toEqual([9.25, 3.5]);
  });
  it("returns excess ingredients on a reduced sale quantity", () => {
    const r = reconcileSales([], [sale], products, stock);
    const edit = reconcileSales(r.sales, [{ ...first(r.sales), qty: 1 }], products, r.stock);
    expect(edit.stock.map((s) => s["qty"])).toEqual([9.75, 4.5]);
  });
  it("restores the previous recipe and deducts the new product recipe on product edit", () => {
    const r = reconcileSales([], [sale], products, stock);
    const other: Row = {
      id: "other",
      name: "Tea",
      price: 100,
      recipe: JSON.stringify([{ stockId: "oil", qty: 0.25 }]),
    };
    const edit = reconcileSales(
      r.sales,
      [{ ...first(r.sales), product: "Tea" }],
      [...products, other],
      r.stock,
    );
    expect(edit.stock.map((s) => s["qty"])).toEqual([10, 4.5]);
  });
  it("rejects deletion when original ingredient stock rows are missing", () => {
    const r = reconcileSales([], [sale], products, stock);
    expect(() => reconcileSales(r.sales, [], products, [])).toThrow();
  });
  it("returns original usage on deletion even after the recipe changes", () => {
    const r = reconcileSales([], [sale], products, stock);
    const removed = reconcileSales(r.sales, [], [{ ...products[0], recipe: "[]" }], r.stock);
    expect(removed.stock).toEqual(stock);
  });
  it("does not double deduct on customer or price edits and keeps original cost", () => {
    const r = reconcileSales([], [sale], products, stock);
    const changed = reconcileSales(
      r.sales,
      [{ ...first(r.sales), customer: "Other", price: 600 }],
      products,
      r.stock,
    );
    expect(changed.stock).toEqual(r.stock);
    expect(first(changed.sales)["unitCost"]).toBe(125);
  });
  it("rejects insufficient inventory without mutating inputs", () => {
    expect(() => reconcileSales([], [{ ...sale, qty: 100 }], products, stock)).toThrow();
    expect(stock.map((s) => s["qty"])).toEqual([10, 5]);
  });
  it("leaves legacy sales untouched when no usage snapshot exists", () => {
    expect(reconcileSales([sale], [sale], products, stock).stock).toEqual(stock);
  });
  it("requires a price for recipe ingredients", () => {
    expect(() => recipeCost(products[0], [{ ...stock[0], unitCost: "" }, stock[1]])).toThrow();
  });
  it("persists sale and inventory offline", () => {
    localStorage.clear();
    for (const [key, rows] of [
      ["products", products],
      ["stock", stock],
      ["sales", []],
    ] as const)
      localStorage.setItem("biz:" + key, JSON.stringify(rows));
    saveSales([sale]);
    expect(JSON.parse(localStorage.getItem("biz:stock") ?? "[]")[0].qty).toBe(9.5);
    expect(JSON.parse(localStorage.getItem("biz:sales") ?? "[]")[0].unitCost).toBe(125);
  });
  it("round trips recipes and usage in the existing backup", () => {
    const r = reconcileSales([], [sale], products, stock);
    const tables = {
      ...Object.fromEntries(TABLE_KEYS.map((k) => [k, []])),
      products,
      stock: r.stock,
      sales: r.sales,
    };
    expect(parseBackup(JSON.stringify({ app: "food-margin-manager", version: 1, tables }))).toEqual(
      tables,
    );
  });
  it("rejects malformed nested recipe backup before replacement", () => {
    const tables = {
      ...Object.fromEntries(TABLE_KEYS.map((k) => [k, []])),
      products: [{ ...products[0], recipe: '[{"stockId":"rice","qty":-0.25}]' }],
    };
    expect(() =>
      parseBackup(JSON.stringify({ app: "food-margin-manager", version: 1, tables })),
    ).toThrow();
  });
  it("does not expose recipes or cost to staff", () => {
    expect(staffProjection("products", products)).toEqual([
      { id: "meal", name: "Meal", price: 500 },
    ]);
    expect(staffProjection("stock", stock)[0]).toEqual({
      id: "rice",
      name: "Rice",
      unit: "kg",
      qty: 10,
    });
  });
});

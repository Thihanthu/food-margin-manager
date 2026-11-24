import type { Row } from "./store";

export type Ingredient = { stockId: string; qty: number };
export function parseIngredients(text: string): Ingredient[] {
  const value: unknown = JSON.parse(text);
  if (
    !Array.isArray(value) ||
    value.some(
      (v) =>
        !v || typeof v.stockId !== "string" || !v.stockId || !Number.isFinite(v.qty) || v.qty <= 0,
    )
  )
    throw new Error("ကုန်ကြမ်းသုံးနှုန်း မမှန်ပါ။");
  return value;
}
export function ingredients(product?: Row): Ingredient[] {
  if (!product?.["recipe"]) return [];
  return parseIngredients(String(product["recipe"]));
}
const round = (n: number) => Math.round(n * 1e9) / 1e9;
export function saleTotal(quantity: unknown, price: unknown): number | null {
  const count = typeof quantity === "string" && !quantity.trim() ? Number.NaN : Number(quantity);
  const unitPrice = typeof price === "string" && !price.trim() ? Number.NaN : Number(price);
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0)
    return null;
  return round(count * unitPrice);
}
export function recipeCost(product: Row, stock: Row[]) {
  const recipe = ingredients(product);
  return recipe.length
    ? round(
        recipe.reduce((total, item) => {
          const row = stock.find((s) => s.id === item.stockId);
          const price = Number(row?.["unitCost"]);
          if (!row || !Number.isFinite(price) || price < 0 || row["unitCost"] === "")
            throw new Error("ကုန်ကြမ်းတစ်ယူနစ်ဈေး ဖြည့်ပါ။");
          return total + item.qty * price;
        }, 0),
      )
    : Number(product["cost"] ?? 0);
}
function usage(sale: Row): Ingredient[] {
  return sale["usage"] ? parseIngredients(String(sale["usage"])) : [];
}
export function stockWithdrawals(sales: Row[], stock: Row[]) {
  const stockById = new Map(stock.map((row) => [row.id, row]));
  return sales
    .flatMap((sale) =>
      usage(sale).map((item) => {
        const stockItem = stockById.get(item.stockId);
        return {
          id: `${sale.id}:${item.stockId}`,
          date: String(sale["date"] ?? ""),
          time: String(sale["time"] ?? ""),
          customer: String(sale["customer"] ?? ""),
          product: String(sale["product"] ?? ""),
          stockName: String(stockItem?.["name"] ?? item.stockId),
          unit: String(stockItem?.["unit"] ?? ""),
          qty: item.qty,
        };
      }),
    )
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
export function reconcileSales(previous: Row[], next: Row[], products: Row[], stock: Row[]) {
  const balances = new Map(stock.map((row) => [row.id, Number(row["qty"])]));
  const old = new Map(previous.map((row) => [row.id, row]));
  const current = new Map(next.map((row) => [row.id, row]));
  const changed = (a: Row, b?: Row) =>
    !b || a["product"] !== b["product"] || Number(a["qty"]) !== Number(b["qty"]);
  for (const row of previous)
    if (changed(row, current.get(row.id))) {
      for (const item of usage(row)) {
        if (!balances.has(item.stockId) || !Number.isFinite(balances.get(item.stockId)))
          throw new Error("ပြန်ထည့်ရမည့် ကုန်ကြမ်းလက်ကျန်စာရင်း မရှိပါ။");
        balances.set(item.stockId, round(Number(balances.get(item.stockId)) + item.qty));
      }
    }
  const sales = next.map((row) => {
    const before = old.get(row.id);
    if (!Number.isFinite(Number(row["price"])) || Number(row["price"]) < 0)
      throw new Error("ရောင်းဈေး မှန်ကန်စွာ ဖြည့်ပါ။");
    if (before && !changed(row, before))
      return {
        ...row,
        ...("usage" in before ? { usage: before["usage"] } : {}),
        ...("unitCost" in before ? { unitCost: before["unitCost"] } : {}),
      };
    const product = products.find((p) => p["name"] === row["product"]);
    const count = Number(row["qty"]);
    if (!product || !Number.isFinite(count) || count <= 0)
      throw new Error("ပစ္စည်းနှင့် အရေအတွက် မှန်ကန်စွာ ရွေးပါ။");
    const used = ingredients(product).map((item) => ({ ...item, qty: round(item.qty * count) }));
    for (const item of used) {
      if (!balances.has(item.stockId) || !Number.isFinite(balances.get(item.stockId)))
        throw new Error("ကုန်ကြမ်းလက်ကျန်စာရင်း မပြည့်စုံပါ။");
      const remaining = round(Number(balances.get(item.stockId)) - item.qty);
      if (remaining < 0) throw new Error("ကုန်ကြမ်းလက်ကျန် မလုံလောက်ပါ။");
      balances.set(item.stockId, remaining);
    }
    return { ...row, usage: JSON.stringify(used), unitCost: recipeCost(product, stock) };
  });
  return {
    sales,
    stock: stock.map((row) => ({ ...row, qty: balances.get(row.id) ?? row["qty"] ?? 0 })),
  };
}
export function saleProfit(row: Row, products: Row[], stock: Row[]) {
  const product = products.find((p) => p["name"] === row["product"]);
  const cost =
    typeof row["unitCost"] === "number"
      ? row["unitCost"]
      : product
        ? recipeCost(product, stock)
        : 0;
  return round(Number(row["qty"]) * (Number(row["price"]) - cost));
}
export function saveSales(next: Row[]) {
  const read = (key: string): Row[] => JSON.parse(localStorage.getItem("biz:" + key) ?? "[]");
  const result = reconcileSales(read("sales"), next, read("products"), read("stock"));
  const previousStock = localStorage.getItem("biz:stock");
  try {
    localStorage.setItem("biz:stock", JSON.stringify(result.stock));
    localStorage.setItem("biz:sales", JSON.stringify(result.sales));
  } catch (error) {
    if (previousStock === null) localStorage.removeItem("biz:stock");
    else localStorage.setItem("biz:stock", previousStock);
    throw error;
  }
  window.dispatchEvent(new Event("biz:changed"));
  return result;
}

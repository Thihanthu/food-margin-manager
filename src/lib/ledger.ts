import { recipeCost } from "@/lib/recipes";
import { num, type Row } from "@/lib/store";

export type LedgerCsvRow = Array<string | number | null | undefined>;

export function downloadCsv(filename: string, headers: string[], rows: LedgerCsvRow[]) {
  const cell = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    const safe = /^[=+@\t\r-]/.test(text) && !/^-?\d+(?:\.\d+)?$/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const content = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saleAmount(row: Row): number {
  return num(row["qty"]) * num(row["price"]);
}

export function saleCost(row: Row, products: Row[], stock: Row[]): number {
  const quantity = num(row["qty"]);
  const snapshot = row["unitCost"];
  if (typeof snapshot === "number" && Number.isFinite(snapshot)) return quantity * snapshot;
  const product = products.find((item) => item["name"] === row["product"]);
  if (!product) return 0;
  try {
    return quantity * recipeCost(product, stock);
  } catch {
    return quantity * num(product["cost"]);
  }
}

export function isDateInPeriod(
  date: unknown,
  period: "all" | "day" | "month" | "year",
  selected: string,
): boolean {
  if (period === "all") return true;
  const value = String(date ?? "");
  if (period === "day") return value === selected;
  if (period === "month") return value.startsWith(selected);
  return value.startsWith(selected);
}

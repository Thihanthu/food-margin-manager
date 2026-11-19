import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, isDateInPeriod, saleAmount, saleCost, type LedgerCsvRow } from "@/lib/ledger";
import { ks, num, type Row } from "@/lib/store";

type Period = "day" | "month" | "year" | "all";

function exportRows(
  sales: Row[],
  daily: Row[],
  supplierEntries: Row[],
  suppliers: Row[],
  period: Period,
  selected: string,
): LedgerCsvRow[] {
  const inPeriod = (date: unknown) => isDateInPeriod(date, period, selected);
  return [
    ...(period === "all"
      ? suppliers
          .filter((supplier) => num(supplier["owed"]) > 0)
          .map((supplier) => [
            "",
            "ကုန်သည်အစပေးရန်ကျန်ငွေ",
            supplier["name"],
            "အဖွင့်လက်ကျန်",
            "",
            "",
            "",
            supplier["owed"],
            0,
            supplier["owed"],
          ])
      : []),
    ...sales
      .filter((row) => inPeriod(row["date"]))
      .map((row) => [
        row["date"],
        "ဖောက်သည်အရောင်း",
        row["customer"],
        row["product"],
        row["qty"],
        "",
        row["price"],
        saleAmount(row),
        "",
        "",
      ]),
    ...supplierEntries
      .filter((row) => inPeriod(row["date"]))
      .map((row) => [
        row["date"],
        row["kind"] === "purchase" ? "ကုန်သည်ထံ ဝယ်ယူမှု" : "ကုန်သည်ထံ ငွေပေးချေမှု",
        row["supplier"],
        row["item"],
        row["qty"],
        row["unit"],
        row["unitPrice"],
        row["kind"] === "payment" ? -num(row["amount"]) : num(row["amount"]),
        row["paid"],
        row["kind"] === "purchase" ? num(row["amount"]) - num(row["paid"]) : 0,
      ]),
    ...daily
      .filter((row) => inPeriod(row["date"]))
      .map((row) => [
        row["date"],
        "နေ့စဉ်ကုန်ကျငွေ",
        "",
        row["item"],
        "",
        "",
        "",
        row["amount"],
        "",
        "",
      ]),
  ]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map((row) => [...row, ""]);
}

export function ExpenseSummaryPanel({
  sales,
  products,
  stock,
  daily,
  supplierEntries,
  suppliers,
}: {
  sales: Row[];
  products: Row[];
  stock: Row[];
  daily: Row[];
  supplierEntries: Row[];
  suppliers: Row[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<Period>("all");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const selected = period === "day" ? day : period === "month" ? month : year;
  const inPeriod = (date: unknown) => isDateInPeriod(date, period, selected);
  const periodSales = sales.filter((row) => inPeriod(row["date"]));
  const periodDaily = daily.filter((row) => inPeriod(row["date"]));
  const periodSupplierEntries = supplierEntries.filter((row) => inPeriod(row["date"]));
  const productCosts = new Map<string, { qty: number; revenue: number; cost: number }>();
  for (const sale of periodSales) {
    const name = String(sale["product"] ?? "ပစ္စည်းမသိ");
    const current = productCosts.get(name) ?? { qty: 0, revenue: 0, cost: 0 };
    current.qty += num(sale["qty"]);
    current.revenue += saleAmount(sale);
    current.cost += saleCost(sale, products, stock);
    productCosts.set(name, current);
  }
  const productRows = Array.from(productCosts, ([name, values]) => ({ name, ...values })).sort(
    (a, b) => b.cost - a.cost,
  );
  const purchaseItems = new Map<
    string,
    { name: string; unit: string; qty: number; total: number; paid: number }
  >();
  for (const entry of periodSupplierEntries) {
    if (entry["kind"] !== "purchase") continue;
    const name = String(entry["item"] ?? "ပစ္စည်းမသိ");
    const unit = String(entry["unit"] ?? "");
    const key = `${name}\u0000${unit}`;
    const current = purchaseItems.get(key) ?? { name, unit, qty: 0, total: 0, paid: 0 };
    current.qty += num(entry["qty"]);
    current.total += num(entry["amount"]);
    current.paid += num(entry["paid"]);
    purchaseItems.set(key, current);
  }
  const purchaseRows = Array.from(purchaseItems.values()).sort((a, b) => b.total - a.total);
  const costOfGoods = productRows.reduce((total, row) => total + row.cost, 0);
  const dailyExpense = periodDaily.reduce((total, row) => total + num(row["amount"]), 0);
  const purchaseTotal = periodSupplierEntries
    .filter((row) => row["kind"] === "purchase")
    .reduce((total, row) => total + num(row["amount"]), 0);
  const supplierPaid = periodSupplierEntries.reduce(
    (total, row) => total + (row["kind"] === "payment" ? num(row["amount"]) : num(row["paid"])),
    0,
  );
  const csvHeaders = [
    "ရက်စွဲ",
    "စာရင်းအမျိုးအစား",
    "ဖောက်သည်/ကုန်သည်",
    "ပစ္စည်း/အကြောင်းအရာ",
    "အရေအတွက်",
    "ယူနစ်",
    "တစ်ခုဈေး",
    "ပမာဏ",
    "ပေးပြီး",
    "ပေးရန်ကျန်",
    "မှတ်ချက်",
  ];

  function download(periodToExport: Period, selection: string, suffix: string) {
    downloadCsv(
      `business-ledger-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      csvHeaders,
      exportRows(sales, daily, supplierEntries, suppliers, periodToExport, selection),
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">ကုန်ကျစရိတ်နှင့် လယ်ဂျာအနှစ်ချုပ်</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ရောင်းကုန်အရင်းကို ရောင်းချသည့်ရက်၏ ကုန်ကြမ်းဈေးမှတွက်ပြီး၊ ကုန်သည်ထံ ဝယ်ယူငွေကို သီးခြားပြထားပါသည်။
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => download(period, selected, period === "all" ? "selected" : selected)}
          >
            <Download className="size-4" /> ရွေးကာလ CSV
          </Button>
          <Button type="button" onClick={() => download("all", "", "all")}>
            <Download className="size-4" /> လယ်ဂျာအားလုံး CSV
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["day", "နေ့စဉ်"],
            ["month", "လစဉ်"],
            ["year", "နှစ်စဉ်"],
            ["all", "စုစုပေါင်း"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={period === value ? "default" : "outline"}
            onClick={() => setPeriod(value)}
          >
            {label}
          </Button>
        ))}
        {period === "day" && (
          <input
            type="date"
            aria-label="နေ့စဉ်ကုန်ကျစရိတ်ရက်ရွေးရန်"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="rounded-md border bg-background p-2 text-sm"
          />
        )}
        {period === "month" && (
          <input
            type="month"
            aria-label="လစဉ်ကုန်ကျစရိတ်လရွေးရန်"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-md border bg-background p-2 text-sm"
          />
        )}
        {period === "year" && (
          <input
            type="number"
            aria-label="နှစ်စဉ်ကုန်ကျစရိတ်နှစ်ရွေးရန်"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-28 rounded-md border bg-background p-2 text-sm"
          />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["ရောင်းကုန်အရင်း", costOfGoods],
          ["နေ့စဉ်အသုံးစရိတ်", dailyExpense],
          ["ကုန်သည်ထံ ဝယ်ယူမှု", purchaseTotal],
          ["ကုန်သည်ထံ ပေးချေပြီး", supplierPaid],
        ].map(([label, amount]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-bold">{ks(Number(amount))}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">ပစ္စည်းအလိုက် ရောင်းကုန်အရင်း</h3>
        {productRows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            ရွေးထားသောကာလတွင် အရောင်းစာရင်း မရှိပါ။
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {["ပစ္စည်း", "ရောင်းအရေအတွက်", "ရောင်းရငွေ", "အရင်းကုန်ကျငွေ"].map((heading) => (
                    <th key={heading} className="px-3 py-2">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={row.name} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.qty}</td>
                    <td className="px-3 py-2">{ks(row.revenue)}</td>
                    <td className="px-3 py-2 font-semibold">{ks(row.cost)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/40 font-bold">
                  <td className="px-3 py-2">စုစုပေါင်း</td>
                  <td className="px-3 py-2">
                    {productRows.reduce((total, row) => total + row.qty, 0)}
                  </td>
                  <td className="px-3 py-2">
                    {ks(productRows.reduce((total, row) => total + row.revenue, 0))}
                  </td>
                  <td className="px-3 py-2">{ks(costOfGoods)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">ကုန်သည်ထံ ဝယ်ယူသောပစ္စည်းအလိုက် ကုန်ကျငွေ</h3>
        {purchaseRows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            ရွေးထားသောကာလတွင် ကုန်သည်ထံမှ ဝယ်ယူမှု မရှိပါ။
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {["ပစ္စည်း", "ဝယ်အရေအတွက်", "ယူနစ်", "ဝယ်ယူငွေ", "ပေးချေပြီး", "ပေးရန်ကျန်"].map((heading) => (
                    <th key={heading} className="px-3 py-2">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseRows.map((row) => (
                  <tr key={`${row.name}-${row.unit}`} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.qty}</td>
                    <td className="px-3 py-2">{row.unit}</td>
                    <td className="px-3 py-2">{ks(row.total)}</td>
                    <td className="px-3 py-2">{ks(row.paid)}</td>
                    <td className="px-3 py-2">{ks(row.total - row.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">နေ့စဉ်အသုံးစရိတ်မှတ်တမ်း</h3>
        {periodDaily.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            ရွေးထားသောကာလတွင် နေ့စဉ်အသုံးစရိတ် မရှိပါ။
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[360px] text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {["ရက်စွဲ", "အကြောင်းအရာ", "ပမာဏ"].map((heading) => (
                    <th key={heading} className="px-3 py-2">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodDaily
                  .slice()
                  .sort((a, b) => String(b["date"]).localeCompare(String(a["date"])))
                  .map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">{row["date"]}</td>
                      <td className="px-3 py-2">{row["item"]}</td>
                      <td className="px-3 py-2 font-semibold">{ks(num(row["amount"]))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

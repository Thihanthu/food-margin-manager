import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditableTable, type Col } from "@/components/EditableTable";
import { useTable, num, sum, ks, uid, type Row } from "@/lib/store";
import { OfflineApp } from "@/components/OfflineApp";
import { Button } from "@/components/ui/button";
import { CustomerPanel } from "@/components/CustomerPanel";
import { ExpenseSummaryPanel } from "@/components/ExpenseSummaryPanel";
import { RecipePanel } from "@/components/RecipePanel";
import { SalesPanel } from "@/components/SalesPanel";
import { SupplierPanel } from "@/components/SupplierPanel";
import { recipeCost, recipeStatus, saleProfit, saveSales, stockWithdrawals } from "@/lib/recipes";
import { localDateTime } from "@/lib/offline-access";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ContactRound,
  CookingPot,
  Package,
  ReceiptText,
  ShoppingCart,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import {
  APP_SETTINGS_KEY,
  applyAppSettings,
  loadAppSettings,
  type AppSettings,
} from "@/lib/app-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "စားသောက်ဆိုင် စာရင်းစနစ်" },
      { name: "description", content: "ဝန်ထမ်း၊ ကုန်ကြမ်း၊ ဆိုင်ခွန်၊ နေ့စဉ်ကုန်ကျငွေနှင့် ပစ္စည်းဈေးနှုန်းများ စီမံရန်" },
      { property: "og:title", content: "စားသောက်ဆိုင် စာရင်းစနစ်" },
      { property: "og:description", content: "ကုန်ကျစရိတ်နှင့် ဈေးနှုန်းများကို လွယ်ကူစွာ စီမံပါ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflineHome,
});

function OfflineHome() {
  return (
    <OfflineApp>
      <Index />
    </OfflineApp>
  );
}

const today = () => localDateTime().date;
const TABS = [
  "အနှစ်ချုပ်",
  "ပစ္စည်းဈေးနှုန်း",
  "ဝန်ထမ်းစရိတ်",
  "ကုန်ကြမ်းစရိတ်",
  "ဆိုင်ခွန်",
  "နေ့စဉ်ကုန်ကျငွေ",
  "နေ့စဉ်အရောင်း",
  "ပစ္စည်းလက်ကျန်",
  "ကုန်သည်စာရင်း",
  "ဖောက်သည်စာရင်း",
  "လစဉ်/နှစ်စဉ်ချုပ်",
  "ကုန်ကြမ်းသုံးနှုန်း",
];

function Index() {
  const [tab, setTab] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings);
  useEffect(() => {
    applyAppSettings(appSettings);
  }, [appSettings]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === APP_SETTINGS_KEY || event.key === null) setAppSettings(loadAppSettings());
    };
    const refresh = () => setAppSettings(loadAppSettings());
    window.addEventListener("storage", sync);
    window.addEventListener("app:settings-changed", refresh);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("app:settings-changed", refresh);
    };
  }, []);
  const [products, setProducts] = useTable("products", [
    { id: uid(), name: "မုန့်ဟင်းခါး", price: 2500, cost: 1200 },
    { id: uid(), name: "လက်ဖက်ရည်", price: 1000, cost: 400 },
  ]);
  const [staff, setStaff] = useTable("staff", [
    { id: uid(), name: "ကိုအောင်", role: "စားဖိုမှူး", salary: 400000 },
  ]);
  const [materials, setMaterials] = useTable("materials", [
    { id: uid(), name: "ဆန်", unit: "အိတ်", qty: 2, price: 85000 },
  ]);
  const [taxes, setTaxes] = useTable("taxes", [
    { id: uid(), name: "စည်ပင်ခွန်", amount: 50000, note: "လစဉ်" },
  ]);
  const [daily, setDaily] = useTable("daily", [
    { id: uid(), date: today(), item: "ဓာတ်ဆီ", amount: 15000 },
  ]);

  const [sales] = useTable("sales", [
    { id: uid(), date: today(), product: "မုန့်ဟင်းခါး", qty: 20, price: 2500 },
  ]);
  const [stock, setStock] = useTable("stock", [
    { id: uid(), name: "ဆန်", unit: "အိတ်", qty: 1, min: 2, supplier: "ဦးဘ" },
  ]);
  const [suppliers, setSuppliers] = useTable("suppliers", [
    { id: uid(), name: "ဦးဘ", phone: "09xxxxxxx", goods: "ဆန်", owed: 0 },
  ]);
  const [supplierLedger, setSupplierLedger] = useTable("supplierLedger", []);
  const [customers, setCustomers] = useTable("customers", []);
  const saleT = (r: Row) => num(r["qty"]) * num(r["price"]);
  const cost = (r: Row) => {
    try {
      return recipeCost(r, stock);
    } catch {
      return num(r["cost"]);
    }
  };
  const saleP = (r: Row) => {
    try {
      return saleProfit(r, products, stock);
    } catch {
      return (
        num(r["qty"]) *
        (num(r["price"]) - num(products.find((p) => p["name"] === r["product"])?.["cost"]))
      );
    }
  };
  const salesT = sum(sales, saleT);
  const todaySales = sum(
    sales.filter((r) => r["date"] === today()),
    saleT,
  );
  const lowStock = stock.filter((r) => num(r["qty"]) <= num(r["min"]));
  const withdrawals = stockWithdrawals(sales, stock);
  const fixedM = sum(staff, (r) => num(r["salary"])) + sum(taxes, (r) => num(r["amount"]));
  const months = Array.from(
    new Set([...sales, ...daily].map((r) => String(r["date"] ?? "").slice(0, 7)).filter(Boolean)),
  )
    .sort()
    .reverse();
  const mRow = (m: string) => {
    const rev = sum(
      sales.filter((r) => String(r["date"]).startsWith(m)),
      saleT,
    );
    const gp = sum(
      sales.filter((r) => String(r["date"]).startsWith(m)),
      saleP,
    );
    const exp = sum(
      daily.filter((r) => String(r["date"]).startsWith(m)),
      (r) => num(r["amount"]),
    );
    return { rev, gp, exp, net: gp - exp - fixedM };
  };
  const years = Array.from(new Set(months.map((m) => m.slice(0, 4))));
  const yRow = (y: string) =>
    months
      .filter((m) => m.startsWith(y))
      .map(mRow)
      .reduce(
        (a, b) => ({ rev: a.rev + b.rev, gp: a.gp + b.gp, exp: a.exp + b.exp, net: a.net + b.net }),
        { rev: 0, gp: 0, exp: 0, net: 0 },
      );

  const staffT = sum(staff, (r) => num(r["salary"]));
  const matT = sum(materials, (r) => num(r["qty"]) * num(r["price"]));
  const taxT = sum(taxes, (r) => num(r["amount"]));
  const dailyT = sum(daily, (r) => num(r["amount"]));
  const todayT = sum(
    daily.filter((r) => r["date"] === today()),
    (r) => num(r["amount"]),
  );
  const total = staffT + matT + taxT + dailyT;

  const margin = (r: Row) => ks(num(r["price"]) - cost(r));
  const tabIcons = [
    BarChart3,
    Package,
    Users,
    CookingPot,
    ReceiptText,
    WalletCards,
    ShoppingCart,
    Boxes,
    Store,
    ContactRound,
    CalendarDays,
    CookingPot,
  ];

  return (
    <div className="min-h-screen md:pl-[220px]">
      <aside className="fixed bottom-0 left-0 top-[57px] z-30 hidden w-[220px] flex-col border-r border-border/70 bg-card/95 px-3 pb-4 pt-5 shadow-lg shadow-primary/5 md:flex">
        <div className="mb-5 flex items-center gap-3 px-2">
          {appSettings.logo ? (
            <img
              src={appSettings.logo}
              alt=""
              className="size-11 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Store className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{appSettings.appName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{appSettings.subtitle}</p>
          </div>
        </div>
        <nav
          aria-label="စာရင်းအမျိုးအစားများ"
          className="app-scrollbar flex-1 space-y-1 overflow-y-auto pr-1"
        >
          {TABS.map((t, i) => {
            const Icon = tabIcons[i] ?? BarChart3;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${tab === i ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{t}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          Offline ready
        </div>
      </aside>

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <nav
          aria-label="စာရင်းအမျိုးအစားများ"
          className="app-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-2 md:hidden"
        >
          {TABS.map((label, index) => {
            const Icon = tabIcons[index] ?? BarChart3;
            return (
              <button
                key={label}
                type="button"
                aria-current={tab === index ? "page" : undefined}
                onClick={() => setTab(index)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium ${tab === index ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </nav>
        {tab === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["ဝန်ထမ်းစရိတ် (လစဉ်)", staffT, Users],
                ["ကုန်ကြမ်းစရိတ်", matT, CookingPot],
                ["ဆိုင်ခွန်", taxT, ReceiptText],
                ["နေ့စဉ်ကုန်ကျငွေ (စုစုပေါင်း)", dailyT, WalletCards],
                ["ယနေ့ ကုန်ကျငွေ", todayT, CalendarDays],
                ["ယနေ့ ရောင်းရငွေ", todaySales, ShoppingCart],
                ["စုစုပေါင်း ရောင်းရငွေ", salesT, BarChart3],
              ] as const
            ).map(([l, v, Icon]) => (
              <div
                key={l}
                className="group rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{l}</p>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight">{ks(v)}</p>
              </div>
            ))}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/15">
              <div className="absolute -right-8 -top-10 size-28 rounded-full bg-white/10" />
              <p className="text-sm font-medium opacity-80">စုစုပေါင်း ကုန်ကျစရိတ်</p>
              <p className="mt-4 text-2xl font-bold tracking-tight">{ks(total)}</p>
            </div>
            {lowStock.length > 0 && (
              <div className="rounded-lg border border-destructive bg-card p-5 sm:col-span-2 lg:col-span-3">
                <p className="font-semibold text-destructive">⚠ ပြန်ဝယ်ရန် လိုသောပစ္စည်းများ</p>
                <p className="mt-1 text-sm">
                  {lowStock.map((r) => `${r["name"]} (လက်ကျန် ${r["qty"]} ${r["unit"]})`).join("၊ ")}
                </p>
              </div>
            )}
          </div>
        )}
        {tab === 1 && (
          <EditableTable
            rows={products}
            setRows={setProducts}
            blank={{ name: "", price: 0, cost: 0, voiceAliases: "" }}
            cols={
              [
                { key: "name", label: "ပစ္စည်းအမည်" },
                { key: "voiceAliases", label: "အသံဖမ်းမှားလေ့ရှိသော အမည်များ (၊ ဖြင့်ခွဲ)" },
                { key: "price", label: "ရောင်းဈေး", type: "number" },
                { key: "cost", label: "အရင်း (ကိုယ်တိုင်ဖြည့်)", type: "number" },
                { key: "recipeStatus", label: "ကုန်ကြမ်းချိတ်ဆက်မှု", calc: (r) => recipeStatus(r, stock) },
                {
                  key: "recipeCost",
                  label: "တွက်ချက်ထားသောအရင်း",
                  calc: (r) => {
                    try {
                      return ks(recipeCost(r, stock));
                    } catch {
                      return "ကုန်ကြမ်းဈေး စစ်ပါ";
                    }
                  },
                },
                { key: "m", label: "အမြတ်", calc: margin },
              ] as Col[]
            }
          />
        )}
        {tab === 2 && (
          <EditableTable
            rows={staff}
            setRows={setStaff}
            blank={{ name: "", role: "", salary: 0 }}
            cols={[
              { key: "name", label: "အမည်" },
              { key: "role", label: "တာဝန်" },
              { key: "salary", label: "လစာ", type: "number" },
            ]}
          />
        )}
        {tab === 3 && (
          <EditableTable
            rows={materials}
            setRows={setMaterials}
            blank={{ name: "", unit: "", qty: 1, price: 0 }}
            cols={[
              { key: "name", label: "ကုန်ကြမ်း" },
              { key: "unit", label: "ယူနစ်" },
              { key: "qty", label: "အရေအတွက်", type: "number" },
              { key: "price", label: "တစ်ခုဈေး", type: "number" },
              { key: "t", label: "စုစုပေါင်း", calc: (r) => ks(num(r["qty"]) * num(r["price"])) },
            ]}
          />
        )}
        {tab === 4 && (
          <EditableTable
            rows={taxes}
            setRows={setTaxes}
            blank={{ name: "", amount: 0, note: "" }}
            cols={[
              { key: "name", label: "ခွန်အမျိုးအစား" },
              { key: "amount", label: "ပမာဏ", type: "number" },
              { key: "note", label: "မှတ်ချက်" },
            ]}
          />
        )}
        {tab === 5 && (
          <EditableTable
            rows={daily}
            setRows={setDaily}
            blank={{ date: today(), item: "", amount: 0 }}
            cols={[
              { key: "date", label: "ရက်စွဲ", type: "date" },
              { key: "item", label: "အကြောင်းအရာ" },
              { key: "amount", label: "ပမာဏ", type: "number" },
            ]}
          />
        )}
        {tab === 6 && (
          <SalesPanel
            rows={sales}
            products={products}
            stock={stock}
            customers={customers}
            save={saveSales}
            profit={saleP}
          />
        )}
        {tab === 7 && (
          <div className="space-y-8">
            <EditableTable
              rows={stock}
              setRows={setStock}
              blank={{ name: "", unit: "", qty: 0, min: 0, supplier: "", unitCost: 0 }}
              cols={[
                { key: "name", label: "ပစ္စည်း" },
                { key: "unit", label: "ယူနစ်" },
                { key: "qty", label: "လက်ကျန်", type: "number" },
                { key: "unitCost", label: "တစ်ယူနစ်ဈေး", type: "number" },
                { key: "min", label: "အနည်းဆုံးထားရမည်", type: "number" },
                { key: "supplier", label: "ကုန်သည်" },
                {
                  key: "s",
                  label: "အခြေအနေ",
                  calc: (r) => (num(r["qty"]) <= num(r["min"]) ? "⚠ ပြန်ဝယ်ရန်" : "✓ လုံလောက်"),
                },
              ]}
            />
            <section className="space-y-3">
              <div>
                <h2 className="text-xl font-bold">ကုန်ပစ္စည်းထုတ်ယူမှုမှတ်တမ်း</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  အရောင်းမှတ်တမ်း၏ ရက်စွဲ/အချိန်အတိုင်း ချက်နည်းတွင် သုံးထားသော ကုန်ကြမ်းကို ပြထားပါသည်။
                </p>
              </div>
              {withdrawals.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  ကုန်ကြမ်းထုတ်ယူမှုမှတ်တမ်း မရှိသေးပါ။
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-muted text-left text-muted-foreground">
                      <tr>
                        {["ရက်စွဲ", "အချိန်", "အရောင်းပစ္စည်း", "ဖောက်သည်", "ထုတ်ယူသောကုန်ကြမ်း", "အရေအတွက်"].map(
                          (heading) => (
                            <th key={heading} className="px-3 py-2">
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((movement) => (
                        <tr key={movement.id} className="border-t">
                          <td className="px-3 py-2">{movement.date || "—"}</td>
                          <td className="px-3 py-2">{movement.time || "—"}</td>
                          <td className="px-3 py-2">{movement.product || "—"}</td>
                          <td className="px-3 py-2">{movement.customer || "—"}</td>
                          <td className="px-3 py-2">{movement.stockName}</td>
                          <td className="px-3 py-2">
                            {movement.qty} {movement.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
        {tab === 8 && (
          <SupplierPanel
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            entries={supplierLedger}
            setEntries={setSupplierLedger}
          />
        )}
        {tab === 9 && <CustomerPanel rows={customers} setRows={setCustomers} sales={sales} />}
        {tab === 11 && <RecipePanel products={products} stock={stock} setProducts={setProducts} />}
        {tab === 10 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              အသားတင် = အရောင်းအမြတ် − နေ့စဉ်ကုန်ကျငွေ − လစဉ်ပုံသေစရိတ် (ဝန်ထမ်း + ခွန်: {ks(fixedM)})
            </p>
            {(
              [
                ["လစဉ် စာရင်းချုပ်", months, mRow],
                ["နှစ်စဉ် စာရင်းချုပ်", years, yRow],
              ] as const
            ).map(([title, keys, fn]) => (
              <div key={title}>
                <h2 className="mb-2 text-lg font-bold">{title}</h2>
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        {["ကာလ", "ရောင်းရငွေ", "အရောင်းအမြတ်", "နေ့စဉ်ကုန်ကျငွေ", "အသားတင်"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => {
                        const r = fn(k);
                        return (
                          <tr key={k} className="border-t">
                            <td className="px-3 py-2 font-medium">{k}</td>
                            <td className="px-3 py-2">{ks(r.rev)}</td>
                            <td className="px-3 py-2">{ks(r.gp)}</td>
                            <td className="px-3 py-2">{ks(r.exp)}</td>
                            <td
                              className={`px-3 py-2 font-bold ${r.net < 0 ? "text-destructive" : "text-primary"}`}
                            >
                              {ks(r.net)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <ExpenseSummaryPanel
              sales={sales}
              products={products}
              stock={stock}
              daily={daily}
              supplierEntries={supplierLedger}
              suppliers={suppliers}
            />
          </div>
        )}
      </main>
    </div>
  );
}

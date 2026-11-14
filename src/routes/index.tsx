import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EditableTable, type Col } from "@/components/EditableTable";
import { useTable, num, sum, ks, uid, type Row } from "@/lib/store";

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
  component: Index,
});

const today = () => new Date().toISOString().slice(0, 10);
const TABS = ["အနှစ်ချုပ်", "ပစ္စည်းဈေးနှုန်း", "ဝန်ထမ်းစရိတ်", "ကုန်ကြမ်းစရိတ်", "ဆိုင်ခွန်", "နေ့စဉ်ကုန်ကျငွေ"];

function Index() {
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useTable("products", [
    { id: uid(), name: "မုန့်ဟင်းခါး", price: 2500, cost: 1200 },
    { id: uid(), name: "လက်ဖက်ရည်", price: 1000, cost: 400 },
  ]);
  const [staff, setStaff] = useTable("staff", [{ id: uid(), name: "ကိုအောင်", role: "စားဖိုမှူး", salary: 400000 }]);
  const [materials, setMaterials] = useTable("materials", [
    { id: uid(), name: "ဆန်", unit: "အိတ်", qty: 2, price: 85000 },
  ]);
  const [taxes, setTaxes] = useTable("taxes", [{ id: uid(), name: "စည်ပင်ခွန်", amount: 50000, note: "လစဉ်" }]);
  const [daily, setDaily] = useTable("daily", [
    { id: uid(), date: today(), item: "ဓာတ်ဆီ", amount: 15000 },
  ]);

  const staffT = sum(staff, (r) => num(r["salary"]));
  const matT = sum(materials, (r) => num(r["qty"]) * num(r["price"]));
  const taxT = sum(taxes, (r) => num(r["amount"]));
  const dailyT = sum(daily, (r) => num(r["amount"]));
  const todayT = sum(daily.filter((r) => r["date"] === today()), (r) => num(r["amount"]));
  const total = staffT + matT + taxT + dailyT;

  const margin = (r: Row) => ks(num(r["price"]) - num(r["cost"]));

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-2xl font-bold">စားသောက်ဆိုင် စာရင်းစနစ်</h1>
          <p className="text-sm opacity-80">နှိပ်ပြီး တိုက်ရိုက်ပြင်နိုင်ပါသည် — အလိုအလျောက် သိမ်းဆည်းပါသည်</p>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium ${tab === i ? "bg-background text-foreground" : "opacity-80 hover:opacity-100"}`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["ဝန်ထမ်းစရိတ် (လစဉ်)", staffT],
              ["ကုန်ကြမ်းစရိတ်", matT],
              ["ဆိုင်ခွန်", taxT],
              ["နေ့စဉ်ကုန်ကျငွေ (စုစုပေါင်း)", dailyT],
              ["ယနေ့ ကုန်ကျငွေ", todayT],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-lg border bg-card p-5">
                <p className="text-sm text-muted-foreground">{l}</p>
                <p className="mt-1 text-2xl font-bold">{ks(v as number)}</p>
              </div>
            ))}
            <div className="rounded-lg bg-accent p-5 text-accent-foreground">
              <p className="text-sm">စုစုပေါင်း ကုန်ကျစရိတ်</p>
              <p className="mt-1 text-2xl font-bold">{ks(total)}</p>
            </div>
          </div>
        )}
        {tab === 1 && <EditableTable rows={products} setRows={setProducts} blank={{ name: "", price: 0, cost: 0 }}
          cols={[{ key: "name", label: "ပစ္စည်းအမည်" }, { key: "price", label: "ရောင်းဈေး", type: "number" },
            { key: "cost", label: "အရင်း", type: "number" }, { key: "m", label: "အမြတ်", calc: margin }] as Col[]} />}
        {tab === 2 && <EditableTable rows={staff} setRows={setStaff} blank={{ name: "", role: "", salary: 0 }}
          cols={[{ key: "name", label: "အမည်" }, { key: "role", label: "တာဝန်" }, { key: "salary", label: "လစာ", type: "number" }]} />}
        {tab === 3 && <EditableTable rows={materials} setRows={setMaterials} blank={{ name: "", unit: "", qty: 1, price: 0 }}
          cols={[{ key: "name", label: "ကုန်ကြမ်း" }, { key: "unit", label: "ယူနစ်" }, { key: "qty", label: "အရေအတွက်", type: "number" },
            { key: "price", label: "တစ်ခုဈေး", type: "number" }, { key: "t", label: "စုစုပေါင်း", calc: (r) => ks(num(r["qty"]) * num(r["price"])) }]} />}
        {tab === 4 && <EditableTable rows={taxes} setRows={setTaxes} blank={{ name: "", amount: 0, note: "" }}
          cols={[{ key: "name", label: "ခွန်အမျိုးအစား" }, { key: "amount", label: "ပမာဏ", type: "number" }, { key: "note", label: "မှတ်ချက်" }]} />}
        {tab === 5 && <EditableTable rows={daily} setRows={setDaily} blank={{ date: today(), item: "", amount: 0 }}
          cols={[{ key: "date", label: "ရက်စွဲ", type: "date" }, { key: "item", label: "အကြောင်းအရာ" }, { key: "amount", label: "ပမာဏ", type: "number" }]} />}
      </main>
    </div>
  );
}

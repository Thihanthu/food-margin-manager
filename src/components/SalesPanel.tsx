import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ks, uid, type Row } from "@/lib/store";
import { VoiceSaleEntry } from "@/components/VoiceSaleEntry";

export function SalesPanel({
  rows,
  products,
  customers,
  save,
  profit,
}: {
  rows: Row[];
  products: Row[];
  customers: Row[];
  save: (rows: Row[]) => void;
  profit: (row: Row) => number;
}) {
  const [draft, setDraft] = useState<Row | null>(null);
  const [error, setError] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    try {
      save(
        rows.some((row) => row.id === draft.id)
          ? rows.map((row) => (row.id === draft.id ? draft : row))
          : [...rows, draft],
      );
      setDraft(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "သိမ်းမရပါ။");
    }
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">နေ့စဉ်အရောင်း</h2>
        <Button
          onClick={() => {
            setDraft({
              id: uid(),
              date: new Date().toISOString().slice(0, 10),
              customer: "",
              product: "",
              qty: 1,
              price: 0,
            });
            setError("");
          }}
        >
          <Plus />
          အရောင်းထည့်ရန်
        </Button>
      </div>
      <VoiceSaleEntry
        products={products}
        onApply={({ productId, qty, customer }) => {
          const product = products.find((row) => row.id === productId);
          setDraft((current) => ({
            id: current?.id ?? uid(),
            date: current?.date ?? new Date().toISOString().slice(0, 10),
            customer: customer || current?.["customer"] || "",
            product: product?.["name"] ?? current?.["product"] ?? "",
            qty,
            price: product?.["price"] ?? current?.["price"] ?? 0,
          }));
        }}
      />
      {draft && (
        <form onSubmit={submit} className="grid gap-4 border-y py-5 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block">ပစ္စည်းအမည်</span>
            <select
              aria-label="ပစ္စည်းအမည်"
              required
              value={String(draft["product"])}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  product: e.target.value,
                  price: products.find((row) => row["name"] === e.target.value)?.["price"] ?? 0,
                })
              }
              className="w-full rounded-md border bg-background p-3"
            >
              <option value="">ရွေးပါ</option>
              {products.map((row) => (
                <option key={row.id} value={row["name"]}>
                  {row["name"]}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["date", "ရက်စွဲ", "date"],
              ["customer", "ဖောက်သည်အမည်", "text"],
              ["qty", "အရေအတွက်", "number"],
              ["price", "ရောင်းဈေး", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="min-w-0 space-y-2">
              <span className="block">{label}</span>
              <input
                required={key !== "customer"}
                type={type}
                step={type === "number" ? "any" : undefined}
                min={key === "qty" ? "0.000000001" : key === "price" ? "0" : undefined}
                list={key === "customer" ? "sale-customers" : undefined}
                value={draft[key]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [key]: type === "number" ? Number(e.target.value) : e.target.value,
                  })
                }
                className="w-full rounded-md border bg-background p-3"
              />
            </label>
          ))}
          <datalist id="sale-customers">
            {customers.map((row) => (
              <option key={row.id} value={row["name"]} />
            ))}
          </datalist>
          <p className="font-semibold">
            ကျသင့်ငွေ: {ks(Number(draft["qty"]) * Number(draft["price"]))}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">အရောင်းသိမ်းရန်</Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              မလုပ်တော့ပါ
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="divide-y border-y">
        {rows.map((row) => (
          <article key={row.id} className="space-y-3 py-4">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-semibold">
                  {row["customer"] || "အမည်မပါ"} · {row["product"]}
                </h3>
                <p className="text-sm text-muted-foreground">{row["date"]}</p>
              </div>
              <div className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="အရောင်းပြင်ရန်"
                  title="အရောင်းပြင်ရန်"
                  onClick={() => {
                    setDraft({ ...row, customer: row["customer"] ?? "" });
                    setError("");
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="အရောင်းဖျက်ရန်"
                  title="အရောင်းဖျက်ရန်"
                  onClick={() => {
                    if (confirm("ဤအရောင်းကို ဖျက်မလား?")) {
                      try {
                        save(rows.filter((item) => item.id !== row.id));
                        if (draft?.id === row.id) setDraft(null);
                        setError("");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "ဖျက်မရပါ။");
                      }
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["အရေအတွက်", row["qty"]],
                ["ရောင်းဈေး", ks(Number(row["price"]))],
                ["ရောင်းရငွေ", ks(Number(row["qty"]) * Number(row["price"]))],
                ["အမြတ်", ks(profit(row))],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

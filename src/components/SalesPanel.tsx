import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ks, uid, type Row } from "@/lib/store";
import { localDateTime } from "@/lib/offline-access";
import { recipeStatus } from "@/lib/recipes";
import { VoiceSaleEntry } from "@/components/VoiceSaleEntry";

export function SalesPanel({
  rows,
  products,
  stock,
  customers,
  save,
  profit,
}: {
  rows: Row[];
  products: Row[];
  stock: Row[];
  customers: Row[];
  save: (rows: Row[]) => void;
  profit: (row: Row) => number;
}) {
  const [draft, setDraft] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const voiceCursor = useRef<{ start: number; end: number } | null>(null);
  const customerInput = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const sortedRows = [...rows].sort((a, b) =>
    `${b["date"]} ${b["time"] ?? ""}`.localeCompare(`${a["date"]} ${a["time"] ?? ""}`),
  );
  const draftCustomer = draft?.["customer"];
  const selectedProduct = products.find((row) => row.id === draft?.["productId"]);
  const selectedRecipeStatus = selectedProduct ? recipeStatus(selectedProduct, stock) : "";
  useEffect(() => {
    if (pendingCaret.current === null || !customerInput.current) return;
    customerInput.current.focus();
    customerInput.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [draftCustomer]);
  function rememberVoiceCursor() {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.dataset["voiceCursor"] === "customer") {
      voiceCursor.current = {
        start: active.selectionStart ?? active.value.length,
        end: active.selectionEnd ?? active.value.length,
      };
    }
  }
  function insertVoiceText(text: string) {
    const cursor = voiceCursor.current;
    if (!cursor || !draft) return false;
    const value = String(draft["customer"] ?? "");
    const start = Math.min(cursor.start, value.length);
    const end = Math.min(cursor.end, value.length);
    const nextCaret = start + text.length;
    voiceCursor.current = { start: nextCaret, end: nextCaret };
    pendingCaret.current = nextCaret;
    setDraft({ ...draft, customer: value.slice(0, start) + text + value.slice(end) });
    return true;
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    try {
      const customerName = String(draft["customer"] ?? "").trim();
      const customer = customers.find(
        (row) =>
          String(row["name"] ?? "")
            .trim()
            .toLocaleLowerCase() === customerName.toLocaleLowerCase(),
      );
      const savedDraft: Row = { ...draft, customer: customerName };
      if (customer) savedDraft["customerId"] = customer.id;
      else delete savedDraft["customerId"];
      save(
        rows.some((row) => row.id === savedDraft.id)
          ? rows.map((row) => (row.id === savedDraft.id ? savedDraft : row))
          : [...rows, savedDraft],
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
            const timestamp = localDateTime();
            setDraft({
              id: uid(),
              date: timestamp.date,
              time: timestamp.time,
              customer: "",
              productId: "",
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
        customers={customers}
        onBeforeRecord={rememberVoiceCursor}
        onInsertText={insertVoiceText}
        onApply={({ productId, qty, customer }) => {
          const product = products.find((row) => row.id === productId);
          const timestamp = localDateTime();
          setDraft((current) => ({
            id: current?.id ?? uid(),
            date: current?.["date"] ?? timestamp.date,
            time: current?.["time"] ?? timestamp.time,
            customer: customer || current?.["customer"] || "",
            productId,
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
              value={String(
                draft["productId"] ??
                  products.find((row) => row["name"] === draft["product"])?.id ??
                  "",
              )}
              onChange={(e) => {
                const product = products.find((row) => row.id === e.target.value);
                setDraft({
                  ...draft,
                  productId: e.target.value,
                  product: String(product?.["name"] ?? ""),
                  price: product?.["price"] ?? 0,
                });
              }}
              className="w-full rounded-md border bg-background p-3"
            >
              <option value="">ရွေးပါ</option>
              {products.map((row) => (
                <option key={row.id} value={row.id}>
                  {row["name"]} — {recipeStatus(row, stock)}
                </option>
              ))}
            </select>
          </label>
          {selectedProduct && selectedRecipeStatus !== "ကုန်ကြမ်းမသုံး" && (
            <p className="text-sm text-amber-700 sm:col-span-2">
              {selectedRecipeStatus === "ကုန်ကြမ်းမချိတ်ရသေး"
                ? `${selectedProduct["name"]} အတွက် ကုန်ကြမ်းမချိတ်ရသေးပါ။ အရောင်းတွင် ကုန်ကြမ်းလက်ကျန် မလျော့ပါ။ “ကုန်ကြမ်းသုံးနှုန်း” စာမျက်နှာတွင် ချိတ်ပါ။`
                : `${selectedProduct["name"]} ၏ ကုန်ကြမ်းချိတ်ဆက်မှု စစ်ရန်လိုပါသည်။ ${selectedRecipeStatus}`}
            </p>
          )}
          {(
            [
              ["date", "ရက်စွဲ", "date"],
              ["time", "လာဝယ်ချိန်", "time"],
              ["customer", "ဖောက်သည်အမည်", "text"],
              ["qty", "အရေအတွက်", "number"],
              ["price", "ရောင်းဈေး", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="min-w-0 space-y-2">
              <span className="block">{label}</span>
              <input
                ref={key === "customer" ? customerInput : undefined}
                required={key !== "customer" && key !== "time"}
                type={type}
                step={type === "number" ? "any" : undefined}
                min={key === "qty" ? "0.000000001" : key === "price" ? "0" : undefined}
                list={key === "customer" ? "sale-customers" : undefined}
                data-voice-cursor={key === "customer" ? "customer" : undefined}
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
        {sortedRows.map((row) => (
          <article key={row.id} className="space-y-3 py-4">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-semibold">
                  {row["customer"] || "အမည်မပါ"} · {row["product"]}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {row["date"]} {row["time"] ? `· ${row["time"]}` : ""}
                </p>
              </div>
              <div className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="အရောင်းပြင်ရန်"
                  title="အရောင်းပြင်ရန်"
                  onClick={() => {
                    setDraft({
                      ...row,
                      customer: row["customer"] ?? "",
                      productId:
                        row["productId"] ??
                        products.find((product) => product["name"] === row["product"])?.id ??
                        "",
                      time: row["time"] ?? "",
                    });
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

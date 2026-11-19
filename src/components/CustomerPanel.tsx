import { useState } from "react";
import { Download, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, saleAmount } from "@/lib/ledger";
import { ks, uid, type Row } from "@/lib/store";

const empty = {
  name: "",
  phone: "",
  address: "",
  lastPurchase: "",
  purchaseHistory: "",
  owed: 0,
  note: "",
  voiceAliases: "",
};

export function CustomerPanel({
  rows,
  setRows,
  sales,
}: {
  rows: Row[];
  setRows: (rows: Row[]) => void;
  sales: Row[];
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Row | null>(() =>
    rows.length === 0 ? { id: uid(), ...empty } : null,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const filtered = rows.filter((row) =>
    [row["name"], row["phone"], row["address"]].some((value) =>
      String(value ?? "")
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    ),
  );
  const selectedCustomer = rows.find((row) => row.id === selectedCustomerId);
  const customerSales = sales
    .filter((sale) => {
      if (selectedCustomer) {
        return (
          sale["customerId"] === selectedCustomer.id ||
          (!sale["customerId"] &&
            String(sale["customer"] ?? "").trim() === String(selectedCustomer["name"] ?? "").trim())
        );
      }
      return String(sale["customer"] ?? "").trim().length > 0;
    })
    .sort((a, b) => String(b["date"]).localeCompare(String(a["date"])));
  const customerSalesTotal = customerSales.reduce((total, sale) => total + saleAmount(sale), 0);

  function exportCustomerSales() {
    downloadCsv(
      `customer-ledger-${selectedCustomer?.id ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["ရက်စွဲ", "ဖောက်သည်", "ပစ္စည်း", "အရေအတွက်", "တစ်ခုဈေး", "စုစုပေါင်း"],
      customerSales.map((sale) => [
        sale["date"],
        sale["customer"],
        sale["product"],
        sale["qty"],
        sale["price"],
        saleAmount(sale),
      ]),
    );
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!String(draft["name"]).trim()) {
      setError("ဖောက်သည်အမည် ဖြည့်ပါ။");
      return;
    }
    const owed = Number(draft["owed"]);
    if (!Number.isFinite(owed) || owed < 0) {
      setError("ရရန်ကျန်ငွေကို သုည သို့မဟုတ် အပေါင်းကိန်း ဖြည့်ပါ။");
      return;
    }
    const customer = { ...draft, name: String(draft["name"]).trim(), owed };
    setRows(
      rows.some((row) => row.id === draft.id)
        ? rows.map((row) => (row.id === draft.id ? customer : row))
        : [...rows, customer],
    );
    setDraft(null);
    setError("");
    setMessage("ဖောက်သည်စာရင်း သိမ်းပြီးပါပြီ။");
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          ဖောက်သည်စာရင်း{" "}
          <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
        </h2>
        <Button
          onClick={() => {
            setDraft({ id: uid(), ...empty });
            setError("");
            setMessage("");
          }}
        >
          <Plus />
          ဖောက်သည်ထည့်ရန်
        </Button>
      </div>
      <label className="flex max-w-md items-center gap-2 rounded-md border bg-background px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          aria-label="ဖောက်သည်ရှာရန်"
          placeholder="အမည်၊ ဖုန်း၊ လိပ်စာ"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      {draft && (
        <form onSubmit={save} className="space-y-4 border-y py-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">
              {rows.some((row) => row.id === draft.id) ? "ဖောက်သည်အချက်အလက် ပြင်ရန်" : "ဖောက်သည်အသစ်"}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="ပိတ်ရန်"
              title="ပိတ်ရန်"
              onClick={() => setDraft(null)}
            >
              <X />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name", "ဖောက်သည်အမည်", "text"],
                ["voiceAliases", "အသံဖမ်းမှားလေ့ရှိသော အမည်များ (၊ ဖြင့်ခွဲ)", "text"],
                ["phone", "ဖုန်းနံပါတ်", "tel"],
                ["address", "လိပ်စာ", "text"],
                ["lastPurchase", "နောက်ဆုံးဝယ်ယူရက်", "date"],
                ["owed", "ရရန်ကျန်ငွေ (ကျပ်)", "number"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="space-y-2 text-sm font-medium">
                <span className="block">{label}</span>
                <input
                  required={key === "name"}
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  step={type === "number" ? "any" : undefined}
                  value={draft[key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                />
              </label>
            ))}
            {(
              [
                ["purchaseHistory", "ဝယ်ယူမှုမှတ်တမ်း"],
                ["note", "မှတ်ချက်"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-2 text-sm font-medium">
                <span className="block">{label}</span>
                <textarea
                  rows={3}
                  value={draft[key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit">သိမ်းရန်</Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              မလုပ်တော့ပါ
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">ဖောက်သည်တစ်ဦးချင်း ဝယ်ယူမှုလယ်ဂျာ</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              နေ့စဉ်အရောင်းစာရင်းမှ ဖောက်သည်အလိုက် စုစည်းထားပါသည်။
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={exportCustomerSales}
            disabled={customerSales.length === 0}
          >
            <Download className="size-4" /> CSV ထုတ်ရန်
          </Button>
        </div>
        <select
          aria-label="ဖောက်သည်လယ်ဂျာကြည့်ရန်"
          value={selectedCustomerId}
          onChange={(event) => setSelectedCustomerId(event.target.value)}
          className="w-full max-w-md rounded-md border bg-background p-3"
        >
          <option value="">အမည်ထည့်ထားသော ဖောက်သည်အားလုံး</option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row["name"]}
            </option>
          ))}
        </select>
        <p className="font-semibold">
          {selectedCustomer ? `${selectedCustomer["name"]} ဝယ်ယူမှုစုစုပေါင်း` : "ဖောက်သည်များ၏ ဝယ်ယူမှုစုစုပေါင်း"}
          : {ks(customerSalesTotal)}
        </p>
        {customerSales.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            ဤဖောက်သည်အတွက် အရောင်းမှတ်တမ်း မရှိသေးပါ။
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {["ရက်စွဲ", "ဖောက်သည်", "ပစ္စည်း", "အရေအတွက်", "တစ်ခုဈေး", "စုစုပေါင်း"].map((heading) => (
                    <th key={heading} className="px-3 py-2">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerSales.map((sale) => (
                  <tr key={sale.id} className="border-t">
                    <td className="px-3 py-2">{sale["date"]}</td>
                    <td className="px-3 py-2">{sale["customer"]}</td>
                    <td className="px-3 py-2">{sale["product"]}</td>
                    <td className="px-3 py-2">{sale["qty"]}</td>
                    <td className="px-3 py-2">{ks(Number(sale["price"]))}</td>
                    <td className="px-3 py-2 font-semibold">{ks(saleAmount(sale))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {filtered.length === 0 ? (
        <p className="border-y py-8 text-center text-muted-foreground">
          {rows.length ? "ရှာဖွေမှုနှင့် ကိုက်ညီသော ဖောက်သည်မရှိပါ။" : "ဖောက်သည်စာရင်း မရှိသေးပါ။"}
        </p>
      ) : (
        <div className="divide-y border-y">
          {filtered.map((row) => (
            <article key={row.id} className="space-y-3 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">{row["name"] || "အမည်မရှိ"}</h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {row["phone"] || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="ဖောက်သည်ပြင်ရန်"
                    title="ဖောက်သည်ပြင်ရန်"
                    onClick={() => {
                      setDraft({ ...empty, ...row });
                      setError("");
                      setMessage("");
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="ဖောက်သည်ဖျက်ရန်"
                    title="ဖောက်သည်ဖျက်ရန်"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm(`${row["name"]} ကို ဖောက်သည်စာရင်းမှ ဖျက်မလား?`)) {
                        setRows(rows.filter((item) => item.id !== row.id));
                        if (draft?.id === row.id) setDraft(null);
                        setMessage("ဖောက်သည်စာရင်း ဖျက်ပြီးပါပြီ။");
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {(
                  [
                    ["လိပ်စာ", row["address"]],
                    ["နောက်ဆုံးဝယ်ယူရက်", row["lastPurchase"]],
                    ["ရရန်ကျန်ငွေ", ks(Number(row["owed"]) || 0)],
                    ["ဝယ်ယူမှုမှတ်တမ်း", row["purchaseHistory"]],
                    ["မှတ်ချက်", row["note"]],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

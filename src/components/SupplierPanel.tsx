import { useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableTable } from "@/components/EditableTable";
import { downloadCsv, type LedgerCsvRow } from "@/lib/ledger";
import { ks, num, uid, type Row } from "@/lib/store";
import { localDateTime } from "@/lib/offline-access";

type SupplierDraft = {
  kind: "purchase" | "payment";
  date: string;
  time: string;
  supplierId: string;
  item: string;
  unit: string;
  qty: string;
  unitPrice: string;
  paid: string;
  amount: string;
  note: string;
};

const blankDraft = (): SupplierDraft => ({
  kind: "purchase",
  ...localDateTime(),
  supplierId: "",
  item: "",
  unit: "",
  qty: "1",
  unitPrice: "",
  paid: "0",
  amount: "",
  note: "",
});

export function SupplierPanel({
  suppliers,
  setSuppliers,
  entries,
  setEntries,
}: {
  suppliers: Row[];
  setSuppliers: (rows: Row[]) => void;
  entries: Row[];
  setEntries: (rows: Row[]) => void;
}) {
  const [draft, setDraft] = useState<SupplierDraft>(blankDraft);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [message, setMessage] = useState("");
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);
  const visibleEntries = entries
    .filter((entry) => !selectedSupplierId || entry["supplierId"] === selectedSupplierId)
    .sort((a, b) =>
      `${b["date"]} ${b["time"] ?? ""}`.localeCompare(`${a["date"]} ${a["time"] ?? ""}`),
    );
  const balanceFor = (supplier: Row) =>
    num(supplier["owed"]) +
    entries.reduce((balance, entry) => {
      if (entry["supplierId"] !== supplier.id) return balance;
      return (
        balance +
        (entry["kind"] === "purchase"
          ? num(entry["amount"]) - num(entry["paid"])
          : -num(entry["amount"]))
      );
    }, 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const supplier = suppliers.find((item) => item.id === draft.supplierId);
    if (!supplier) {
      setMessage("ကုန်သည်ကို ရွေးပါ။");
      return;
    }
    const qty = Number(draft.qty);
    const unitPrice = Number(draft.unitPrice);
    const amount = draft.kind === "purchase" ? qty * unitPrice : Number(draft.amount);
    const paid = draft.kind === "purchase" ? Number(draft.paid) : amount;
    if (
      !draft.date ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (draft.kind === "purchase" &&
        (!draft.item.trim() ||
          !draft.unit.trim() ||
          !Number.isFinite(qty) ||
          qty <= 0 ||
          !Number.isFinite(unitPrice) ||
          unitPrice < 0 ||
          !Number.isFinite(paid) ||
          paid < 0 ||
          paid > amount))
    ) {
      setMessage("ရက်စွဲ၊ ပစ္စည်း၊ အရေအတွက်နှင့် ငွေပမာဏကို မှန်ကန်စွာ ဖြည့်ပါ။");
      return;
    }
    setEntries([
      ...entries,
      {
        id: uid(),
        date: draft.date,
        time: draft.time,
        supplierId: supplier.id,
        supplier: String(supplier["name"] ?? ""),
        kind: draft.kind,
        item: draft.kind === "purchase" ? draft.item.trim() : "ငွေပေးချေမှု",
        unit: draft.kind === "purchase" ? draft.unit.trim() : "",
        qty: draft.kind === "purchase" ? qty : 0,
        unitPrice: draft.kind === "purchase" ? unitPrice : 0,
        amount,
        paid,
        note: draft.note.trim(),
      },
    ]);
    setDraft({ ...blankDraft(), supplierId: supplier.id });
    setMessage("ကုန်သည်လယ်ဂျာစာရင်း သိမ်းပြီးပါပြီ။");
  }

  function exportEntries(rows: Row[], filename: string) {
    const openingBalances: LedgerCsvRow[] = suppliers
      .filter(
        (supplier) =>
          (!selectedSupplierId || supplier.id === selectedSupplierId) && num(supplier["owed"]) > 0,
      )
      .map((supplier) => [
        "",
        "",
        supplier["name"],
        "အစပေးရန်ကျန်ငွေ",
        "အဖွင့်လက်ကျန်",
        "",
        "",
        "",
        supplier["owed"],
        0,
        supplier["owed"],
        "",
      ]);
    const csvRows: LedgerCsvRow[] = [
      ...openingBalances,
      ...rows.map((entry) => [
        entry["date"],
        entry["time"],
        entry["supplier"],
        entry["kind"] === "purchase" ? "ဝယ်ယူမှု" : "ငွေပေးချေမှု",
        entry["item"],
        entry["qty"],
        entry["unit"],
        entry["unitPrice"],
        entry["amount"],
        entry["paid"],
        entry["kind"] === "purchase" ? num(entry["amount"]) - num(entry["paid"]) : 0,
        entry["note"],
      ]),
    ];
    downloadCsv(
      filename,
      [
        "ရက်စွဲ",
        "အချိန်",
        "ကုန်သည်",
        "အမျိုးအစား",
        "ပစ္စည်း",
        "အရေအတွက်",
        "ယူနစ်",
        "တစ်ခုဈေး",
        "ပမာဏ",
        "ပေးပြီး",
        "ပေးရန်ကျန်",
        "မှတ်ချက်",
      ],
      csvRows,
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">ကုန်သည်စာရင်း</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ကုန်သည်အလိုက် ဝယ်ယူမှု၊ ငွေပေးချေမှုနှင့် ပေးရန်ကျန်ငွေကို မှတ်တမ်းတင်ပါ။ ဝယ်ယူမှုမှတ်တမ်းသည် လက်ကျန်ပစ္စည်းစာရင်းကို အလိုအလျောက်
          မပြောင်းပါ။
        </p>
      </div>
      <EditableTable
        rows={suppliers}
        setRows={setSuppliers}
        blank={{ name: "", phone: "", goods: "", owed: 0 }}
        cols={[
          { key: "name", label: "ကုန်သည်အမည်" },
          { key: "phone", label: "ဖုန်း" },
          { key: "goods", label: "ပေးသွင်းသောပစ္စည်း" },
          { key: "owed", label: "အစပေးရန်ကျန်ငွေ", type: "number" },
        ]}
      />
      {suppliers.length > 0 && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-4">
          <h3 className="font-semibold">ကုန်သည်လယ်ဂျာသို့ စာရင်းသစ်ထည့်ရန်</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="block">စာရင်းအမျိုးအစား</span>
              <select
                value={draft.kind}
                onChange={(event) =>
                  setDraft({ ...draft, kind: event.target.value as SupplierDraft["kind"] })
                }
                className="w-full rounded-md border bg-background p-3"
              >
                <option value="purchase">ကုန်ပစ္စည်း ဝယ်ယူမှု</option>
                <option value="payment">ကုန်သည်ထံ ငွေပေးချေမှု</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="block">ကုန်သည်</span>
              <select
                required
                value={draft.supplierId}
                onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })}
                className="w-full rounded-md border bg-background p-3"
              >
                <option value="">ကုန်သည်ရွေးပါ</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier["name"]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="block">ရက်စွဲ</span>
              <input
                required
                type="date"
                value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                className="w-full rounded-md border bg-background p-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="block">အချိန်</span>
              <input
                required
                type="time"
                value={draft.time}
                onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                className="w-full rounded-md border bg-background p-3"
              />
            </label>
            {draft.kind === "purchase" ? (
              <>
                <label className="space-y-2 text-sm">
                  <span className="block">ဝယ်ယူသောပစ္စည်း</span>
                  <input
                    required
                    value={draft.item}
                    onChange={(event) => setDraft({ ...draft, item: event.target.value })}
                    className="w-full rounded-md border bg-background p-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block">အရေအတွက်</span>
                  <input
                    required
                    type="number"
                    min="0.000000001"
                    step="any"
                    value={draft.qty}
                    onChange={(event) => setDraft({ ...draft, qty: event.target.value })}
                    className="w-full rounded-md border bg-background p-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block">ယူနစ် (ဥပမာ - အိတ်၊ kg)</span>
                  <input
                    required
                    value={draft.unit}
                    onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                    className="w-full rounded-md border bg-background p-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block">တစ်ခုဈေး</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={draft.unitPrice}
                    onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })}
                    className="w-full rounded-md border bg-background p-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block">ပေးချေပြီးငွေ</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={draft.paid}
                    onChange={(event) => setDraft({ ...draft, paid: event.target.value })}
                    className="w-full rounded-md border bg-background p-3"
                  />
                </label>
                <p className="self-end font-semibold sm:col-span-2">
                  စုစုပေါင်းဝယ်ယူငွေ: {ks(num(draft.qty) * num(draft.unitPrice))}
                </p>
              </>
            ) : (
              <label className="space-y-2 text-sm">
                <span className="block">ပေးချေသည့်ငွေ</span>
                <input
                  required
                  type="number"
                  min="0.000000001"
                  step="any"
                  value={draft.amount}
                  onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                  className="w-full rounded-md border bg-background p-3"
                />
              </label>
            )}
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="block">မှတ်ချက်</span>
              <input
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="w-full rounded-md border bg-background p-3"
              />
            </label>
          </div>
          <Button type="submit">
            <Plus className="size-4" /> စာရင်းသိမ်းရန်
          </Button>
          {message && (
            <p role="status" className="text-sm text-primary">
              {message}
            </p>
          )}
        </form>
      )}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span>လယ်ဂျာကြည့်ရန်</span>
            <select
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
              className="rounded-md border bg-background p-2"
            >
              <option value="">ကုန်သည်အားလုံး</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier["name"]}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              exportEntries(
                visibleEntries,
                `supplier-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
            disabled={visibleEntries.length === 0}
          >
            <Download className="size-4" /> ကုန်သည်လယ်ဂျာ CSV ထုတ်ရန်
          </Button>
        </div>
        {selectedSupplier && (
          <p className="rounded-xl border bg-muted/40 p-3 text-sm">
            {selectedSupplier["name"]} ပေးရန်ကျန်ငွေ:{" "}
            <strong>{ks(balanceFor(selectedSupplier))}</strong>
          </p>
        )}
        {visibleEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            ကုန်သည်ဝယ်ယူမှုစာရင်း မရှိသေးပါ။
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {[
                    "ရက်စွဲ / အချိန်",
                    "ကုန်သည်",
                    "အမျိုးအစား",
                    "ပစ္စည်း/မှတ်ချက်",
                    "အရေအတွက်",
                    "စုစုပေါင်း",
                    "ပေးပြီး",
                    "ကျန်ငွေ",
                    "",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-3 py-2">
                      {entry["date"]} {entry["time"] ? `· ${entry["time"]}` : ""}
                    </td>
                    <td className="px-3 py-2">{entry["supplier"]}</td>
                    <td className="px-3 py-2">
                      {entry["kind"] === "purchase" ? "ဝယ်ယူမှု" : "ငွေပေးချေမှု"}
                    </td>
                    <td className="px-3 py-2">
                      {entry["item"]}
                      {entry["note"] ? ` · ${entry["note"]}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {entry["kind"] === "purchase" ? `${entry["qty"]} ${entry["unit"]}` : "—"}
                    </td>
                    <td className="px-3 py-2">{ks(num(entry["amount"]))}</td>
                    <td className="px-3 py-2">{ks(num(entry["paid"]))}</td>
                    <td className="px-3 py-2">
                      {entry["kind"] === "purchase"
                        ? ks(num(entry["amount"]) - num(entry["paid"]))
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="လယ်ဂျာစာရင်းဖျက်ရန်"
                        onClick={() => {
                          if (confirm("ဤကုန်သည်လယ်ဂျာစာရင်းကို ဖျက်မလား?"))
                            setEntries(entries.filter((row) => row.id !== entry.id));
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!selectedSupplierId && suppliers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {suppliers.map((supplier) => (
              <p key={supplier.id} className="rounded-xl border bg-card p-3 text-sm">
                {supplier["name"]}: <strong>{ks(balanceFor(supplier))}</strong> ပေးရန်ကျန်
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

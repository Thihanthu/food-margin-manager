import { Plus, Trash2 } from "lucide-react";
import { uid, type Row } from "@/lib/store";

export type Col = { key: string; label: string; type?: "text" | "number" | "date"; calc?: (r: Row) => string };

export function EditableTable({ cols, rows, setRows, blank }: {
  cols: Col[]; rows: Row[]; setRows: (r: Row[]) => void; blank: Omit<Row, "id">;
}) {
  const update = (id: string, k: string, v: string, t?: string) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, [k]: t === "number" ? Number(v) : v } : r)));
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {cols.map((c) => <th key={c.key} className="px-3 py-2 text-left font-semibold">{c.label}</th>)}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              {cols.map((c) => (
                <td key={c.key} className="px-1 py-1">
                  {c.calc ? (
                    <span className="px-2 font-semibold text-primary">{c.calc(r)}</span>
                  ) : (
                    <input
                      type={c.type ?? "text"}
                      value={r[c.key] ?? ""}
                      onChange={(e) => update(r.id, c.key, e.target.value, c.type)}
                      className="w-full min-w-24 rounded-md bg-transparent px-2 py-1.5 outline-none focus:bg-background focus:ring-2 focus:ring-ring"
                    />
                  )}
                </td>
              ))}
              <td>
                <button aria-label="ဖျက်ရန်" onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                  className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setRows([...rows, { id: uid(), ...blank }])}
        className="flex w-full items-center justify-center gap-2 border-t py-2.5 text-sm font-medium text-primary hover:bg-accent">
        <Plus size={16} /> အသစ်ထည့်ရန်
      </button>
    </div>
  );
}

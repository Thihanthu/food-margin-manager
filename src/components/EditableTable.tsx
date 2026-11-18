import { Plus, Trash2 } from "lucide-react";
import { uid, type Row } from "@/lib/store";
import { Button } from "@/components/ui/button";

export type Col = {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
  options?: string[];
  calc?: (r: Row) => string;
};

export function EditableTable({
  cols,
  rows,
  setRows,
  blank,
  readOnly = false,
}: {
  cols: Col[];
  rows: Row[];
  setRows: (r: Row[]) => void;
  blank: Omit<Row, "id">;
  readOnly?: boolean;
}) {
  const update = (id: string, k: string, v: string, t?: string) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, [k]: t === "number" ? Number(v) : v } : r)));
  return (
    <div className="app-scrollbar overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
      <table className="data-table w-full min-w-[560px] text-sm">
        <thead className="border-b bg-muted/70 text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left font-semibold">
                {c.label}
              </th>
            ))}
            {!readOnly && <th className="w-12" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-2">
                  {c.calc ? (
                    <span className="px-2 font-semibold text-primary">{c.calc(r)}</span>
                  ) : readOnly ? (
                    <span className="block px-2 py-1.5">{r[c.key]}</span>
                  ) : (
                    <>
                      <input
                        type={c.type ?? "text"}
                        step={c.type === "number" ? "any" : undefined}
                        aria-label={c.label}
                        list={c.options ? `${r.id}-${c.key}-options` : undefined}
                        value={r[c.key] ?? ""}
                        onChange={(e) => update(r.id, c.key, e.target.value, c.type)}
                        className="w-full min-w-24 rounded-lg border border-transparent bg-transparent px-3 py-2 outline-none hover:border-border focus:border-ring focus:bg-background"
                      />
                      {c.options && (
                        <datalist id={`${r.id}-${c.key}-options`}>
                          {c.options.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      )}
                    </>
                  )}
                </td>
              ))}
              {!readOnly && (
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="ဖျက်ရန်"
                    onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <Button
          variant="ghost"
          onClick={() => setRows([...rows, { id: uid(), ...blank }])}
          className="flex w-full items-center justify-center gap-2 border-t py-2.5 text-sm font-medium text-primary hover:bg-accent"
        >
          <Plus size={16} /> အသစ်ထည့်ရန်
        </Button>
      )}
    </div>
  );
}

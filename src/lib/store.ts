import { useCallback, useEffect, useState } from "react";

export type Row = { id: string; [k: string]: string | number };

export function useTable(key: string, initial: Row[]) {
  const [rows, setState] = useState<Row[]>(initial);
  useEffect(() => {
    function load() {
      const raw = localStorage.getItem("biz:" + key);
      if (raw) setState(JSON.parse(raw));
      else localStorage.setItem("biz:" + key, JSON.stringify(initial));
    }
    load();
    const sync = (event: StorageEvent) => { if (event.key === "biz:" + key || event.key === null) load(); };
    window.addEventListener('biz:changed', load);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('biz:changed', load); window.removeEventListener('storage', sync); };
    // Initial rows are only used when this table has never been stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const setRows = useCallback((next: Row[]) => {
    localStorage.setItem("biz:" + key, JSON.stringify(next));
    setState(next);
    window.dispatchEvent(new Event('biz:changed'));
  }, [key]);
  return [rows, setRows] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const num = (v: unknown) => Number(v) || 0;
export const sum = (rows: Row[], f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
export const ks = (n: number) => n.toLocaleString("en-US") + " ကျပ်";

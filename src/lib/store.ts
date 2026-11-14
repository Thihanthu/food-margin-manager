import { useEffect, useState } from "react";

export type Row = { id: string; [k: string]: string | number };

export function useTable(key: string, initial: Row[]) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem("biz:" + key);
    if (raw) setRows(JSON.parse(raw));
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) localStorage.setItem("biz:" + key, JSON.stringify(rows));
  }, [rows, ready, key]);
  return [rows, setRows] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const num = (v: unknown) => Number(v) || 0;
export const sum = (rows: Row[], f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
export const ks = (n: number) => n.toLocaleString("en-US") + " ကျပ်";

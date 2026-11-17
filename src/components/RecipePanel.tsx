import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ingredients, recipeCost, type Ingredient } from '@/lib/recipes';
import { ks, type Row } from '@/lib/store';

export function RecipePanel({ products, stock, setProducts }: { products: Row[]; stock: Row[]; setProducts: (rows: Row[]) => void }) {
  const [productId, setProductId] = useState('');
  const [draft, setDraft] = useState<Ingredient[]>([]);
  const [message, setMessage] = useState('');
  const product = products.find(row => row.id === productId);
  function save() {
    if (!product) return;
    if (draft.some(item => !stock.some(row => row.id === item.stockId) || !Number.isFinite(item.qty) || item.qty <= 0)) { setMessage('ကုန်ကြမ်းနှင့် သုံးမည့်ပမာဏ မှန်ကန်စွာ ဖြည့်ပါ။'); return; }
    setProducts(products.map(row => row.id === productId ? { ...row, recipe: JSON.stringify(draft) } : row));
    setMessage('ကုန်ကြမ်းသုံးနှုန်း သိမ်းပြီးပါပြီ။');
  }
  return <section className="space-y-5">
    <h2 className="text-xl font-bold">တစ်ယာ / တစ်ပွဲ ကုန်ကြမ်းသုံးနှုန်း</h2>
    <label className="block max-w-md space-y-2"><span>ရောင်းမည့်ပစ္စည်း</span><select className="w-full rounded-md border bg-background p-3" value={productId} onChange={e => { setProductId(e.target.value); setDraft(ingredients(products.find(row => row.id === e.target.value))); setMessage(''); }}><option value="">ရွေးပါ</option>{products.map(row => <option key={row.id} value={row.id}>{row['name']}</option>)}</select></label>
    {product && <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4 border-y py-5">
      <div className="divide-y">{draft.map((item, index) => <div key={index} className="grid grid-cols-[1fr_auto] gap-3 py-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="min-w-0 space-y-2"><span className="block text-sm">ကုန်ကြမ်းအမည်</span><select required value={item.stockId} onChange={e => setDraft(draft.map((row, i) => i === index ? { ...row, stockId: e.target.value } : row))} className="w-full rounded-md border bg-background p-2"><option value="">ရွေးပါ</option>{stock.map(row => <option key={row.id} value={row.id}>{row['name']} ({row['unit']})</option>)}</select></label>
        <label className="col-start-1 min-w-0 space-y-2 sm:col-auto"><span className="block text-sm">တစ်ယာ / တစ်ပွဲ သုံးပမာဏ ({stock.find(row => row.id === item.stockId)?.['unit'] || 'ယူနစ်'})</span><input required type="number" min="0.000000001" step="any" value={item.qty || ''} onChange={e => setDraft(draft.map((row, i) => i === index ? { ...row, qty: Number(e.target.value) } : row))} className="w-full rounded-md border bg-background p-2" /></label>
        <Button type="button" variant="ghost" size="icon" aria-label="ကုန်ကြမ်းဖယ်ရန်" title="ကုန်ကြမ်းဖယ်ရန်" onClick={() => setDraft(draft.filter((_, i) => i !== index))}><Trash2 /></Button>
      </div>)}</div>
      <Button type="button" variant="outline" onClick={() => setDraft([...draft, { stockId: '', qty: 0 }])}><Plus />ကုန်ကြမ်းထည့်ရန်</Button>
      <p className="font-semibold">တစ်ယာ / တစ်ပွဲ အရင်း: {ks(draft.every(item => item.stockId && item.qty > 0) ? recipeCost({ ...product, recipe: JSON.stringify(draft) }, stock) : 0)}</p>
      <Button type="submit">သုံးနှုန်းသိမ်းရန်</Button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
import { useEffect, useState, type ReactNode } from 'react';
import { LogOut, ShieldCheck, Users, Download, Upload, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACCESS_KEY, SESSION_KEY, TABLE_KEYS, makeProfile, passwordHash, parseBackup, restoreSession, staffProjection, type AccessData, type Profile } from '@/lib/offline-access';
import { EditableTable } from '@/components/EditableTable';
import { type Row } from '@/lib/store';

export function OfflineApp({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessData | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false);
  useEffect(() => {
    function loadAccess() {
      try {
        const raw = localStorage.getItem(ACCESS_KEY);
        const data: AccessData | null = raw ? JSON.parse(raw) : null;
        const restored = restoreSession(data, localStorage.getItem(SESSION_KEY));
        setAccess(data); setSession(restored);
        if (!restored) localStorage.removeItem(SESSION_KEY);
      } catch { setSession(null); setError('အကောင့်ဒေတာ ဖတ်မရပါ။'); }
    }
    loadAccess();
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.key === ACCESS_KEY || event.key === SESSION_KEY || event.key === null) {
        loadAccess(); setManage(false);
      }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const saveAccess = (data: AccessData) => { localStorage.setItem(ACCESS_KEY, JSON.stringify(data)); setAccess(data); };
  const signIn = (profile: Profile) => { localStorage.setItem(SESSION_KEY, profile.id); setSession(profile); };
  async function submit() {
    setBusy(true); setError('');
    try {
      if (!access) {
        if (!name.trim() || !username.trim() || password.length < 8) throw new Error('အမည်၊ အကောင့်အမည်နှင့် အနည်းဆုံး ၈ လုံးပါ စကားဝှက် ဖြည့်ပါ။');
        const profile = await makeProfile(username, name, password);
        saveAccess({ profiles: [profile], roles: { [profile.id]: 'admin' } }); signIn(profile);
      } else {
        const profile = access.profiles.find(p => p.username === username.trim().toLowerCase());
        if (!profile || await passwordHash(password, profile.salt) !== profile.hash) throw new Error('အကောင့်အမည် သို့မဟုတ် စကားဝှက် မှားနေပါသည်။');
        if (!restoreSession(access, profile.id)) throw new Error('ဤအကောင့်ကို အသုံးပြုခွင့် မရှိပါ။');
        signIn(profile);
      }
      setPassword(''); setUsername(''); setName('');
    } catch (e) { setError(e instanceof Error ? e.message : 'သိမ်းမရပါ။'); } finally { setBusy(false); }
  }
  if (!ready) return <main className="p-8 text-center">ခဏစောင့်ပါ…</main>;
  if (!session) return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6 py-12">
    <LockKeyhole className="size-10 text-primary" /><h1 className="text-2xl font-bold">စားသောက်ဆိုင် စာရင်းစနစ်</h1>
    <h2 className="text-lg font-semibold">{access ? 'အကောင့်ဝင်ရန်' : 'ပိုင်ရှင်အကောင့် ဖန်တီးရန်'}</h2>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      {!access && <Field label="အမည်" value={name} set={setName} />}
      <Field label="အကောင့်အမည်" value={username} set={setUsername} />
      <Field label="စကားဝှက်" value={password} set={setPassword} type="password" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={busy}>{busy ? 'ခဏစောင့်ပါ…' : access ? 'ဝင်ရန်' : 'ဖန်တီးရန်'}</Button>
    </form>
  </main>;
  const admin = access?.roles[session.id] === 'admin';
  return <>
    <div className="border-b bg-card"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
      <ShieldCheck className="text-primary" /><span className="flex-1 font-semibold">{session.name} · {admin ? 'Admin' : 'User'}</span>
      {admin && <Button variant="outline" onClick={() => setManage(!manage)}><Users />အကောင့် / Backup</Button>}
      <Button variant="ghost" onClick={() => { localStorage.removeItem(SESSION_KEY); setSession(null); setManage(false); setError(''); }}><LogOut />ထွက်ရန်</Button>
    </div></div>
    {admin && manage && access ? <AdminTools access={access} save={saveAccess} /> : admin ? children : <StaffPanel profile={session} />}
  </>;
}
function Field({ label, value, set, type = 'text' }: { label: string; value: string; set: (v: string) => void; type?: string }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span><input required type={type} value={value} onChange={e => set(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>;
}
function AdminTools({ access, save }: { access: AccessData; save: (v: AccessData) => void }) {
  const [username, setUsername] = useState(''); const [name, setName] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true); setMessage('');
    try {
      if (password.length < 8 || !name.trim() || !username.trim()) throw new Error('အမည်၊ အကောင့်အမည်နှင့် အနည်းဆုံး ၈ လုံးပါ စကားဝှက် လိုပါသည်။');
      if (access.profiles.some(p => p.username === username.trim().toLowerCase())) throw new Error('အကောင့်အမည် ရှိပြီးသားပါ။');
      const p = await makeProfile(username, name, password); save({ profiles: [...access.profiles, p], roles: { ...access.roles, [p.id]: 'user' } });
      setUsername(''); setName(''); setPassword(''); setMessage('ဝန်ထမ်းအကောင့် ဖန်တီးပြီးပါပြီ။');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'သိမ်းမရပါ။'); } finally { setBusy(false); }
  }
  function backup() {
    try {
      const tables = Object.fromEntries(TABLE_KEYS.map(key => [key, JSON.parse(localStorage.getItem('biz:' + key) ?? '[]')]));
      const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'food-margin-manager', version: 1, createdAt: new Date().toISOString(), tables }, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `food-ledger-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setMessage('Backup ထုတ်မရပါ။'); }
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const tables = parseBackup(await file.text());
      if (!window.confirm('လက်ရှိစာရင်းအားလုံးကို Backup စာရင်းဖြင့် အစားထိုးမည်။ ဆက်လုပ်မလား?')) return;
      const previous = TABLE_KEYS.map(key => [key, localStorage.getItem('biz:' + key)] as const);
      try { for (const key of TABLE_KEYS) localStorage.setItem('biz:' + key, JSON.stringify(tables[key])); }
      catch (e) { for (const [key, raw] of previous) { if (raw === null) localStorage.removeItem('biz:' + key); else localStorage.setItem('biz:' + key, raw); } throw e; }
      window.location.reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Backup ပြန်ထည့်မရပါ။'); }
  }
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
    <section><h1 className="mb-4 text-xl font-bold">ဝန်ထမ်းအကောင့်များ</h1><div className="divide-y">{access.profiles.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span>{p["name"]} · {p.username} · {access.roles[p.id]}</span>{access.roles[p.id] === 'user' && <Button variant="destructive" size="sm" onClick={() => { if (confirm('ဤဝန်ထမ်းအကောင့်ကို ဖျက်မလား?')) { const roles = { ...access.roles }; delete roles[p.id]; save({ profiles: access.profiles.filter(x => x.id !== p.id), roles }); } }}>ဖျက်ရန်</Button>}</div>)}</div>
    <form onSubmit={e => { e.preventDefault(); void add(); }} className="mt-6 grid gap-4 sm:grid-cols-3"><Field label="ဝန်ထမ်းအမည်" value={name} set={setName} /><Field label="အကောင့်အမည်" value={username} set={setUsername} /><Field label="စကားဝှက်" value={password} set={setPassword} type="password" /><Button disabled={busy}>ဝန်ထမ်းထည့်ရန်</Button></form></section>
    <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-bold">စာရင်း Backup</h2><p className="text-sm text-muted-foreground">Backup တွင် လျှို့ဝှက်စာရင်းများ ပါဝင်သည်။ လုံခြုံသောနေရာတွင် သိမ်းပါ။ အကောင့်နှင့် စကားဝှက်များ မပါဝင်ပါ။</p><div className="flex flex-wrap gap-3"><Button onClick={backup}><Download />Backup ထုတ်ရန်</Button><Button variant="outline" asChild><label className="cursor-pointer"><Upload />Backup ပြန်ထည့်ရန်<input className="hidden" type="file" accept=".json" onChange={e => { void restore(e.target.files?.[0]); e.target.value = ''; }} /></label></Button></div></section>
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
  </main>;
}
function StaffPanel({ profile }: { profile: Profile }) {
  const [customer, setCustomer] = useState('');
  const [tab, setTab] = useState('sales'); const [products, setProducts] = useState<Row[]>([]); const [stock, setStock] = useState<Row[]>([]); const [product, setProduct] = useState(''); const [qty, setQty] = useState('1'); const [message, setMessage] = useState('');
  useEffect(() => { setProducts(staffProjection('products', JSON.parse(localStorage.getItem('biz:products') ?? '[]')) as Row[]); setStock(staffProjection('stock', JSON.parse(localStorage.getItem('biz:stock') ?? '[]')) as Row[]); }, []);
  function record() {
    try {
      const p = products.find(p => p.id === product); const count = Number(qty);
      if (!p || !Number.isFinite(count) || count <= 0) { setMessage('ပစ္စည်းနှင့် အရေအတွက် မှန်ကန်စွာ ရွေးပါ။'); return; }
      const rows = JSON.parse(localStorage.getItem('biz:sales') ?? '[]');
      rows.push({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0,10), customer: customer.trim(), product: p["name"], qty: count, price: p["price"], recordedBy: profile.id });
      localStorage.setItem('biz:sales', JSON.stringify(rows)); setMessage('အရောင်းစာရင်း သိမ်းပြီးပါပြီ။'); setQty('1'); setCustomer('');
    } catch { setMessage('စာရင်းသိမ်းမရပါ။'); }
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6"><h1 className="text-2xl font-bold">ဝန်ထမ်း စာမျက်နှာ</h1><nav className="flex flex-wrap gap-2">{([['sales','အရောင်းထည့်ရန်'],['products','ပစ္စည်းရောင်းဈေး'],['stock','ပစ္စည်းလက်ကျန်']] as const).map(([key,label]) => <Button key={key} variant={tab === key ? 'default' : 'outline'} onClick={() => { setTab(key); setMessage(''); }}>{label}</Button>)}</nav>
    {tab === 'sales' && <form onSubmit={e => { e.preventDefault(); record(); }} className="max-w-md space-y-4"><label className="block space-y-2 text-sm"><span>ဖောက်သည်အမည်</span><input value={customer} onChange={e => setCustomer(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label><label className="block space-y-2 text-sm"><span>ပစ္စည်းအမည်</span><select required aria-label="ပစ္စည်းအမည်" value={product} onChange={e => setProduct(e.target.value)} className="w-full rounded-md border bg-background p-3"><option value="">ရွေးပါ</option>{products.map(p => <option key={p.id} value={p.id}>{p["name"]}</option>)}</select></label><Field label="အရေအတွက်" value={qty} set={setQty} type="number" /><Button>အရောင်းသိမ်းရန်</Button>{message && <p role="status">{message}</p>}</form>}
    {tab === 'products' && <EditableTable readOnly rows={products} setRows={() => {}} blank={{}} cols={[{key:'name',label:'ပစ္စည်းအမည်'},{key:'price',label:'ရောင်းဈေး'}]} />}
    {tab === 'stock' && <EditableTable readOnly rows={stock} setRows={() => {}} blank={{}} cols={[{key:'name',label:'ပစ္စည်း'},{key:'unit',label:'ယူနစ်'},{key:'qty',label:'လက်ကျန်'},{key:'status',label:'အခြေအနေ',calc:r => Number(r["qty"]) <= Number(r["min"]) ? 'ပြန်ဝယ်ရန်' : 'လုံလောက်'}]} />}
  </main>;
}

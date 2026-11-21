import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LogOut,
  ShieldCheck,
  Users,
  Download,
  Upload,
  LockKeyhole,
  Palette,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACCESS_KEY,
  SESSION_KEY,
  TABLE_KEYS,
  makeProfile,
  passwordHash,
  parseBackup,
  resetBusinessData,
  recordShiftEnd,
  restoreSession,
  staffProjection,
  type AccessData,
  type Profile,
} from "@/lib/offline-access";
import { EditableTable } from "@/components/EditableTable";
import { ks, useTable, type Row } from "@/lib/store";
import { saleTotal, saveSales } from "@/lib/recipes";
import { VoiceSaleEntry } from "@/components/VoiceSaleEntry";
import {
  APP_SETTINGS_KEY,
  applyAppSettings,
  defaultAppSettings,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/app-settings";

export function OfflineApp({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessData | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    applyAppSettings(loadAppSettings());
    function loadAccess() {
      try {
        const raw = localStorage.getItem(ACCESS_KEY);
        const data: AccessData | null = raw ? JSON.parse(raw) : null;
        const restored = restoreSession(data, localStorage.getItem(SESSION_KEY));
        setAccess(data);
        setSession(restored);
        if (!restored) localStorage.removeItem(SESSION_KEY);
      } catch {
        setSession(null);
        setError("အကောင့်ဒေတာ ဖတ်မရပါ။");
      }
    }
    loadAccess();
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.key === ACCESS_KEY || event.key === SESSION_KEY || event.key === null) {
        loadAccess();
        if (event.key === SESSION_KEY || event.key === null) setManage(false);
      }
      if (event.key === APP_SETTINGS_KEY || event.key === null) {
        applyAppSettings(loadAppSettings());
      }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const saveAccess = (data: AccessData) => {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(data));
    setAccess(data);
  };
  const signIn = (profile: Profile) => {
    localStorage.setItem(SESSION_KEY, profile.id);
    setSession(profile);
  };
  async function authenticate({
    name,
    username,
    password,
  }: {
    name: string;
    username: string;
    password: string;
  }) {
    if (!access) {
      if (!name.trim() || !username.trim() || password.length < 8)
        throw new Error("အမည်၊ အကောင့်အမည်နှင့် အနည်းဆုံး ၈ လုံးပါ စကားဝှက် ဖြည့်ပါ။");
      const profile = await makeProfile(username, name, password);
      saveAccess({ profiles: [profile], roles: { [profile.id]: "admin" } });
      signIn(profile);
      return;
    }

    const profile = access.profiles.find((p) => p.username === username.trim().toLowerCase());
    if (!profile || (await passwordHash(password, profile.salt)) !== profile.hash)
      throw new Error("အကောင့်အမည် သို့မဟုတ် စကားဝှက် မှားနေပါသည်။");
    if (!restoreSession(access, profile.id)) throw new Error("ဤအကောင့်ကို အသုံးပြုခွင့် မရှိပါ။");
    signIn(profile);
  }
  async function runLogin(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "သိမ်းမရပါ။");
    } finally {
      setBusy(false);
    }
  }
  function submitWeb(formData: FormData) {
    void runLogin(() =>
      authenticate({
        name: String(formData.get("name") ?? ""),
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    );
  }
  if (!ready) return <main className="p-8 text-center">ခဏစောင့်ပါ…</main>;
  if (!session)
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="mb-7 flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Restaurant Ledger
              </p>
              <h1 className="text-xl font-bold">စားသောက်ဆိုင် စာရင်းစနစ်</h1>
            </div>
          </div>
          <h2 className="mb-5 text-lg font-semibold">
            {access ? "အကောင့်ဝင်ရန်" : "ပိုင်ရှင်အကောင့် ဖန်တီးရန်"}
          </h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitWeb(new FormData(e.currentTarget));
            }}
          >
            {!access && (
              <label className="block space-y-2 text-sm font-medium">
                <span>အမည်</span>
                <input
                  required
                  name="name"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
            )}
            <label className="block space-y-2 text-sm font-medium">
              <span>အကောင့်အမည်</span>
              <input
                required
                name="username"
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>စကားဝှက်</span>
              <input
                required
                name="password"
                type="password"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                minLength={access ? undefined : 8}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button className="h-11 w-full" disabled={busy}>
              {busy ? "ခဏစောင့်ပါ…" : access ? "ဝင်ရန်" : "ဖန်တီးရန်"}
            </Button>
          </form>
        </section>
      </main>
    );
  const activeProfile = session;
  const admin = access?.roles[activeProfile.id] === "admin";
  function signOut() {
    setLogoutError("");
    if (!admin) {
      try {
        recordShiftEnd(activeProfile);
        window.dispatchEvent(new Event("biz:changed"));
      } catch (error) {
        setLogoutError(error instanceof Error ? error.message : "အလုပ်ဆင်းချိန် သိမ်းမရပါ။");
        return;
      }
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setManage(false);
    setError("");
  }
  return (
    <>
      {logoutError && (
        <p
          role="alert"
          className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
        >
          {logoutError}
        </p>
      )}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <ShieldCheck className="text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
            {session.name} · {admin ? "Admin" : "User"}
          </span>
          {admin && (
            <Button
              variant="outline"
              size="sm"
              className="px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => setManage(!manage)}
            >
              <Users className="size-4" />
              အကောင့် / Backup
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="px-2 text-xs sm:px-3 sm:text-sm"
            onClick={signOut}
          >
            <LogOut />
            {admin ? "ထွက်ရန်" : "အလုပ်ဆင်းရန်"}
          </Button>
        </div>
      </div>
      {admin && manage && access ? (
        <AdminTools access={access} profileId={session.id} save={saveAccess} />
      ) : admin ? (
        children
      ) : (
        <StaffPanel profile={session} />
      )}
    </>
  );
}
function Field({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2"
      />
    </label>
  );
}
function AdminTools({
  access,
  profileId,
  save,
}: {
  access: AccessData;
  profileId: string;
  save: (v: AccessData) => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attendance] = useTable("attendance", []);
  const [appearance, setAppearance] = useState<AppSettings>(loadAppSettings);
  async function add() {
    setBusy(true);
    setMessage("");
    try {
      if (password.length < 8 || !name.trim() || !username.trim())
        throw new Error("အမည်၊ အကောင့်အမည်နှင့် အနည်းဆုံး ၈ လုံးပါ စကားဝှက် လိုပါသည်။");
      if (access.profiles.some((p) => p.username === username.trim().toLowerCase()))
        throw new Error("အကောင့်အမည် ရှိပြီးသားပါ။");
      const p = await makeProfile(username, name, password);
      save({ profiles: [...access.profiles, p], roles: { ...access.roles, [p.id]: "user" } });
      setUsername("");
      setName("");
      setPassword("");
      setMessage("ဝန်ထမ်းအကောင့် ဖန်တီးပြီးပါပြီ။");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "သိမ်းမရပါ။");
    } finally {
      setBusy(false);
    }
  }
  function backup() {
    try {
      const tables = Object.fromEntries(
        TABLE_KEYS.map((key) => [key, JSON.parse(localStorage.getItem("biz:" + key) ?? "[]")]),
      );
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              {
                app: "food-margin-manager",
                version: 1,
                createdAt: new Date().toISOString(),
                tables,
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `food-ledger-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage("Backup ထုတ်မရပါ။");
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const tables = parseBackup(await file.text());
      if (!window.confirm("လက်ရှိစာရင်းအားလုံးကို Backup စာရင်းဖြင့် အစားထိုးမည်။ ဆက်လုပ်မလား?")) return;
      const previous = TABLE_KEYS.map((key) => [key, localStorage.getItem("biz:" + key)] as const);
      try {
        for (const key of TABLE_KEYS)
          localStorage.setItem("biz:" + key, JSON.stringify(tables[key]));
      } catch (e) {
        for (const [key, raw] of previous) {
          if (raw === null) localStorage.removeItem("biz:" + key);
          else localStorage.setItem("biz:" + key, raw);
        }
        throw e;
      }
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Backup ပြန်ထည့်မရပါ။");
    }
  }
  async function applyReset(passwordValue: string) {
    await resetBusinessData(access, profileId, passwordValue);
    setResetPassword("");
    setResetMessage("စာရင်းဒေတာအားလုံး ဖျက်ပြီးပါပြီ။ Admin အကောင့်နှင့် အပြင်အဆင်ကို ဆက်လက်ထိန်းသိမ်းထားပါသည်။");
    window.dispatchEvent(new Event("biz:changed"));
  }
  async function resetData(event: React.FormEvent) {
    event.preventDefault();
    setResetMessage("");
    setBusy(true);
    try {
      if (!window.confirm("စာရင်းအားလုံးကို အပြီးဖျက်ပါမည်။ Backup အရင်ထုတ်ထားပါသလား?")) return;
      if (!window.confirm("ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်မရပါ။ ဆက်ဖျက်မလား?")) return;
      await applyReset(resetPassword);
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : "စာရင်းဖျက်မရပါ။");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">အပြင်အဆင် Settings</h1>
            <p className="text-sm text-muted-foreground">App name, logo နှင့် အရောင်များကို ပြင်နိုင်ပါသည်။</p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="App အမည်"
              value={appearance.appName}
              set={(value) => setAppearance({ ...appearance, appName: value })}
            />
            <Field
              label="Subtitle"
              value={appearance.subtitle}
              set={(value) => setAppearance({ ...appearance, subtitle: value })}
            />
            {(
              [
                ["primary", "အဓိကအရောင်"],
                ["accent", "တောက်ပအရောင်"],
                ["background", "နောက်ခံအရောင်"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block space-y-2 text-sm font-medium">
                <span>{label}</span>
                <div className="flex items-center gap-3 rounded-lg border bg-background p-2">
                  <input
                    type="color"
                    value={appearance[key]}
                    onChange={(event) =>
                      setAppearance({ ...appearance, [key]: event.target.value })
                    }
                    className="size-9 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  />
                  <input
                    value={appearance[key]}
                    onChange={(event) =>
                      setAppearance({ ...appearance, [key]: event.target.value })
                    }
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm uppercase outline-none"
                  />
                </div>
              </label>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center">
            {appearance.logo ? (
              <img
                src={appearance.logo}
                alt="App logo"
                className="mx-auto size-24 rounded-2xl object-cover shadow-md"
              />
            ) : (
              <span className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ImageIcon className="size-8" />
              </span>
            )}
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="size-4" />
                  Logo တင်ရန်
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        setMessage("Logo ကို 2MB အောက်သာ တင်ပါ။");
                        event.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        setAppearance({ ...appearance, logo: String(reader.result ?? "") });
                      reader.readAsDataURL(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              saveAppSettings(appearance);
              setMessage("App အပြင်အဆင် သိမ်းပြီးပါပြီ။");
            }}
          >
            သိမ်းရန်
          </Button>
          {appearance.logo && (
            <Button variant="ghost" onClick={() => setAppearance({ ...appearance, logo: "" })}>
              Logo ဖယ်ရန်
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setAppearance({ ...defaultAppSettings });
              saveAppSettings({ ...defaultAppSettings });
              setMessage("မူလအရောင်နှင့် အပြင်အဆင် ပြန်ထားပြီးပါပြီ။");
            }}
          >
            <RotateCcw className="size-4" />
            မူလသို့ ပြန်ထားရန်
          </Button>
        </div>
      </section>
      <section>
        <h1 className="mb-4 text-xl font-bold">ဝန်ထမ်းအကောင့်များ</h1>
        <div className="divide-y">
          {access.profiles.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                {p["name"]} · {p.username} · {access.roles[p.id]}
              </span>
              {access.roles[p.id] === "user" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("ဤဝန်ထမ်းအကောင့်ကို ဖျက်မလား?")) {
                      const roles = { ...access.roles };
                      delete roles[p.id];
                      save({ profiles: access.profiles.filter((x) => x.id !== p.id), roles });
                    }
                  }}
                >
                  ဖျက်ရန်
                </Button>
              )}
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="mt-6 grid gap-4 sm:grid-cols-3"
        >
          <Field label="ဝန်ထမ်းအမည်" value={name} set={setName} />
          <Field label="အကောင့်အမည်" value={username} set={setUsername} />
          <Field label="စကားဝှက်" value={password} set={setPassword} type="password" />
          <Button disabled={busy}>ဝန်ထမ်းထည့်ရန်</Button>
        </form>
      </section>
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-xl font-bold">ဝန်ထမ်းအလုပ်ဆင်းချိန်မှတ်တမ်း</h2>
        {attendance.length ? (
          <div className="divide-y border-y">
            {[...attendance]
              .sort((a, b) =>
                `${b["date"]} ${b["time"]}`.localeCompare(`${a["date"]} ${a["time"]}`),
              )
              .map((record) => (
                <div key={record.id} className="flex flex-wrap justify-between gap-2 py-3">
                  <span>{record["staffName"]}</span>
                  <time className="text-sm text-muted-foreground">
                    {record["date"]} · {record["time"]}
                  </time>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">မှတ်တမ်းမရှိသေးပါ။</p>
        )}
      </section>
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-xl font-bold">စာရင်း Backup</h2>
        <p className="text-sm text-muted-foreground">
          Backup တွင် လျှို့ဝှက်စာရင်းများ ပါဝင်သည်။ လုံခြုံသောနေရာတွင် သိမ်းပါ။ အကောင့်နှင့် စကားဝှက်များ မပါဝင်ပါ။
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={backup}>
            <Download />
            Backup ထုတ်ရန်
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload />
              Backup ပြန်ထည့်ရန်
              <input
                className="hidden"
                type="file"
                accept=".json"
                onChange={(e) => {
                  void restore(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-bold text-destructive">စာရင်းအားလုံး Reset လုပ်ရန်</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ရောင်းအား၊ ကုန်ကျစရိတ်၊ ကုန်ပစ္စည်း၊ ကုန်သည်နှင့် ဖောက်သည်စာရင်းအားလုံးကို ဖျက်မည်။ Admin/ဝန်ထမ်းအကောင့်၊ စကားဝှက်နှင့်
            App အပြင်အဆင်များကို မဖျက်ပါ။
          </p>
        </div>
        <form
          onSubmit={(event) => void resetData(event)}
          className="grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <label className="space-y-2 text-sm font-medium">
            <span className="block">Admin စကားဝှက် အတည်ပြုပါ</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <Button type="submit" variant="destructive" className="self-end" disabled={busy}>
            <RotateCcw className="size-4" /> စာရင်းအားလုံး ဖျက်ရန်
          </Button>
        </form>
        {resetMessage && (
          <p role="status" className="text-sm font-medium text-destructive">
            {resetMessage}
          </p>
        )}
      </section>
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
    </main>
  );
}
function StaffPanel({ profile }: { profile: Profile }) {
  const [customer, setCustomer] = useState("");
  const [tab, setTab] = useState("sales");
  const [products, setProducts] = useState<Row[]>([]);
  const [stock, setStock] = useState<Row[]>([]);
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [message, setMessage] = useState("");
  const voiceCursor = useRef<{ start: number; end: number } | null>(null);
  const customerInput = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  useEffect(() => {
    if (pendingCaret.current === null || !customerInput.current) return;
    customerInput.current.focus();
    customerInput.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [customer]);
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
    if (!cursor) return false;
    const start = Math.min(cursor.start, customer.length);
    const end = Math.min(cursor.end, customer.length);
    const nextCaret = start + text.length;
    voiceCursor.current = { start: nextCaret, end: nextCaret };
    pendingCaret.current = nextCaret;
    setCustomer(customer.slice(0, start) + text + customer.slice(end));
    return true;
  }
  const selectedProduct = products.find((item) => item.id === product);
  const payable = selectedProduct ? saleTotal(qty, selectedProduct["price"]) : null;
  useEffect(() => {
    function load() {
      setProducts(
        staffProjection(
          "products",
          JSON.parse(localStorage.getItem("biz:products") ?? "[]"),
        ) as Row[],
      );
      setStock(
        staffProjection("stock", JSON.parse(localStorage.getItem("biz:stock") ?? "[]")) as Row[],
      );
    }
    load();
    window.addEventListener("biz:changed", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("biz:changed", load);
      window.removeEventListener("storage", load);
    };
  }, []);
  function record() {
    try {
      const p = products.find((p) => p.id === product);
      const count = Number(qty);
      const amount = p ? saleTotal(count, p["price"]) : null;
      if (!p || amount === null) {
        setMessage("ပစ္စည်းနှင့် အရေအတွက် မှန်ကန်စွာ ရွေးပါ။");
        return;
      }
      const rows = JSON.parse(localStorage.getItem("biz:sales") ?? "[]");
      rows.push({
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        customer: customer.trim(),
        product: p["name"],
        qty: count,
        price: p["price"],
        recordedBy: profile.id,
      });
      saveSales(rows);
      setMessage(`အရောင်းစာရင်း သိမ်းပြီးပါပြီ။ ကျသင့်ငွေ ${ks(amount)}`);
      setQty("1");
      setCustomer("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "စာရင်းသိမ်းမရပါ။");
    }
  }
  return (
    <div className="min-h-[calc(100vh-57px)] md:pl-[190px]">
      <aside className="fixed bottom-0 left-0 top-[57px] z-20 hidden w-[190px] flex-col border-r border-border/70 bg-card px-3 py-5 md:flex">
        <p className="mb-4 px-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          ဝန်ထမ်း စာမျက်နှာ
        </p>
        <nav className="space-y-1">
          {(
            [
              ["sales", "အရောင်းထည့်ရန်"],
              ["products", "ပစ္စည်းရောင်းဈေး"],
              ["stock", "ပစ္စည်းလက်ကျန်"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              className="mb-1 w-full justify-start"
              onClick={() => {
                setTab(key);
                setMessage("");
              }}
            >
              {label}
            </Button>
          ))}
        </nav>
      </aside>
      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
        <nav
          aria-label="ဝန်ထမ်း စာမျက်နှာများ"
          className="app-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-2 md:hidden"
        >
          {(
            [
              ["sales", "အရောင်းထည့်ရန်"],
              ["products", "ပစ္စည်းရောင်းဈေး"],
              ["stock", "ပစ္စည်းလက်ကျန်"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              className="min-h-10 shrink-0"
              onClick={() => {
                setTab(key);
                setMessage("");
              }}
            >
              {label}
            </Button>
          ))}
        </nav>
        {tab === "sales" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              record();
            }}
            className="max-w-lg space-y-4"
          >
            <VoiceSaleEntry
              products={products}
              onBeforeRecord={rememberVoiceCursor}
              onInsertText={insertVoiceText}
              onApply={({ productId, qty, customer }) => {
                setProduct(productId);
                setQty(String(qty));
                setCustomer(customer);
              }}
            />
            <label className="block space-y-2 text-sm">
              <span>ဖောက်သည်အမည်</span>
              <input
                ref={customerInput}
                data-voice-cursor="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>ပစ္စည်းအမည်</span>
              <select
                required
                aria-label="ပစ္စည်းအမည်"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-md border bg-background p-3"
              >
                <option value="">ရွေးပါ</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p["name"]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="အရေအတွက်" value={qty} set={setQty} type="number" />
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">ကျသင့်ငွေ</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {payable === null ? "ပစ္စည်းရွေးပြီး အရေအတွက်ဖြည့်ပါ" : ks(payable)}
              </p>
              {selectedProduct && payable !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {ks(Number(selectedProduct["price"]))} × {qty}
                </p>
              )}
            </div>
            <Button>အရောင်းသိမ်းရန်</Button>
            {message && <p role="status">{message}</p>}
          </form>
        )}
        {tab === "products" && (
          <EditableTable
            readOnly
            rows={products}
            setRows={() => {}}
            blank={{}}
            cols={[
              { key: "name", label: "ပစ္စည်းအမည်" },
              { key: "price", label: "ရောင်းဈေး" },
            ]}
          />
        )}
        {tab === "stock" &&
          (stock.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              ပစ္စည်းလက်ကျန် မရှိသေးပါ။
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {stock.map((item) => {
                const low = Number(item["qty"]) <= Number(item["min"]);
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-4 ${low ? "border-destructive/30 bg-destructive/5" : "border-border/70 bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold">{item["name"]}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{item["unit"]}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${low ? "bg-destructive text-destructive-foreground" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        {low ? "ပြန်ဝယ်ရန်" : "လုံလောက်"}
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-bold">
                      {item["qty"]} <span className="text-base font-medium">{item["unit"]}</span>
                    </p>
                  </article>
                );
              })}
            </div>
          ))}
      </main>
    </div>
  );
}

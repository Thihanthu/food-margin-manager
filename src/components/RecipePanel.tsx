import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ingredients, recipeCost, recipeStatus, type Ingredient } from "@/lib/recipes";
import { ks, type Row } from "@/lib/store";

export function RecipePanel({
  products,
  stock,
  setProducts,
}: {
  products: Row[];
  stock: Row[];
  setProducts: (rows: Row[]) => void;
}) {
  const [productId, setProductId] = useState("");
  const [draft, setDraft] = useState<Ingredient[]>([]);
  const [message, setMessage] = useState("");
  const product = products.find((row) => row.id === productId);
  let costText = "0 ကျပ်";
  try {
    if (product && draft.length && draft.every((item) => item.stockId && item.qty > 0))
      costText = ks(recipeCost({ ...product, recipe: JSON.stringify(draft) }, stock));
  } catch {
    costText = "ကုန်ကြမ်းတစ်ယူနစ်ဈေး ဖြည့်ပါ။";
  }
  function chooseProduct(id: string) {
    const selected = products.find((row) => row.id === id);
    setProductId(id);
    setDraft(ingredients(selected));
    setMessage("");
  }
  function save() {
    if (!product) return;
    if (draft.length === 0) {
      setMessage("ကုန်ကြမ်းသုံးနှုန်း အနည်းဆုံးတစ်မျိုး ထည့်ပါ။ ကုန်ကြမ်းမသုံးပါက အရင်းကို ကိုယ်တိုင်ဖြည့်နိုင်ပါသည်။");
      return;
    }
    if (
      draft.some(
        (item) =>
          !stock.some((row) => row.id === item.stockId) ||
          !Number.isFinite(item.qty) ||
          item.qty <= 0,
      )
    ) {
      setMessage("ကုန်ကြမ်းနှင့် တစ်ပွဲသုံးပမာဏကို မှန်ကန်စွာရွေးပါ။");
      return;
    }
    try {
      recipeCost({ ...product, recipe: JSON.stringify(draft) }, stock);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ကုန်ကြမ်းဈေး စစ်ပါ။");
      return;
    }
    setProducts(
      products.map((row) =>
        row.id === productId ? { ...row, recipe: JSON.stringify(draft) } : row,
      ),
    );
    setMessage("ရောင်းပစ္စည်းနှင့် ကုန်ကြမ်းကို ချိတ်ဆက်သိမ်းပြီးပါပြီ။");
  }
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">ရောင်းပစ္စည်းနှင့် ကုန်ကြမ်းချိတ်ဆက်ရန်</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ရောင်းမည့်ကုန်ချောတစ်မျိုးစီအတွက် သုံးမည့်ကုန်ကြမ်းနှင့် တစ်ပွဲပမာဏကို ချိတ်ပါ။ ရောင်းပစ္စည်းအမည်နှင့် ကုန်ကြမ်းအမည် မတူနိုင်ပါ။
        </p>
      </div>
      <label className="block max-w-md space-y-2">
        <span>ရောင်းမည့်ကုန်ပစ္စည်း</span>
        <select
          aria-label="ရောင်းမည့်ပစ္စည်း"
          className="w-full rounded-md border bg-background p-3"
          value={productId}
          onChange={(event) => chooseProduct(event.target.value)}
        >
          <option value="">ရောင်းပစ္စည်းရွေးပါ</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row["name"]} — {recipeStatus(row, stock)}
            </option>
          ))}
        </select>
      </label>
      {!product && products.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          ပထမဦးစွာ “ပစ္စည်းဈေးနှုန်း” စာမျက်နှာတွင် ရောင်းမည့်ကုန်ပစ္စည်းများကို ထည့်ပါ။
        </p>
      )}
      {!product && products.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p className="font-medium">ကုန်ကြမ်းမချိတ်ရသေးသော ရောင်းပစ္စည်းများ</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {products
              .filter((row) => !row["recipe"])
              .map((row) => (
                <li key={row.id}>{row["name"]}</li>
              ))}
          </ul>
          {products.every((row) => row["recipe"]) && (
            <p className="text-muted-foreground">ပစ္စည်းအားလုံးအတွက် ကုန်ကြမ်းချိတ်ဆက်ပြီးပါပြီ။</p>
          )}
          {stock.length === 0 && (
            <p className="text-destructive">ပထမဦးစွာ “ပစ္စည်းလက်ကျန်” တွင် ကုန်ကြမ်းများ ထည့်ပါ။</p>
          )}
        </div>
      )}
      {product && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="space-y-4 border-y py-5"
        >
          <p className="rounded-lg border bg-muted/40 p-3 text-sm">
            ချိတ်ဆက်နေသော ရောင်းပစ္စည်း: <strong>{product["name"]}</strong>
          </p>
          {stock.length === 0 ? (
            <p className="text-sm text-destructive">
              ကုန်ကြမ်းစာရင်းမရှိသေးပါ။ “ပစ္စည်းလက်ကျန်” စာမျက်နှာတွင် အရင်ထည့်ပါ။
            </p>
          ) : (
            <div className="divide-y">
              {draft.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_auto] gap-3 py-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="min-w-0 space-y-2">
                    <span className="block text-sm">ဤရောင်းပစ္စည်းတွင် ပါဝင်သော ကုန်ကြမ်း</span>
                    <select
                      aria-label={`ကုန်ကြမ်းအမည် ${index + 1}`}
                      required
                      value={item.stockId}
                      onChange={(event) =>
                        setDraft(
                          draft.map((row, i) =>
                            i === index ? { ...row, stockId: event.target.value } : row,
                          ),
                        )
                      }
                      className="w-full rounded-md border bg-background p-2"
                    >
                      <option value="">ကုန်ကြမ်းရွေးပါ</option>
                      {stock.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row["name"]} ({row["unit"]})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-start-1 min-w-0 space-y-2 sm:col-auto">
                    <span className="block text-sm">
                      တစ်ပွဲသုံးပမာဏ ({stock.find((row) => row.id === item.stockId)?.["unit"] || "ယူနစ်"})
                    </span>
                    <input
                      required
                      type="number"
                      min="0.000000001"
                      step="any"
                      value={item.qty || ""}
                      onChange={(event) =>
                        setDraft(
                          draft.map((row, i) =>
                            i === index ? { ...row, qty: Number(event.target.value) } : row,
                          ),
                        )
                      }
                      className="w-full rounded-md border bg-background p-2"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="ကုန်ကြမ်းဖယ်ရန်"
                    title="ကုန်ကြမ်းဖယ်ရန်"
                    onClick={() => setDraft(draft.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={stock.length === 0}
            onClick={() => setDraft([...draft, { stockId: "", qty: 0 }])}
          >
            <Plus />
            ကုန်ကြမ်းထည့်ရန်
          </Button>
          <p className="font-semibold">တစ်ပွဲအရင်း: {costText}</p>
          <Button type="submit" disabled={stock.length === 0}>
            ချိတ်ဆက်မှုသိမ်းရန်
          </Button>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
    </section>
  );
}

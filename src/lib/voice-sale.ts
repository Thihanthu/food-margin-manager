import type { Row } from "@/lib/store";

const burmeseDigits: Record<string, number> = {
  "၀": 0,
  "၁": 1,
  "၂": 2,
  "၃": 3,
  "၄": 4,
  "၅": 5,
  "၆": 6,
  "၇": 7,
  "၈": 8,
  "၉": 9,
};

export function normalizeDigits(text: string): string {
  return text.replace(/[၀-၉]/g, (digit) => String(burmeseDigits[digit] ?? digit));
}

export function parseVoiceSale(
  transcript: string,
  products: Row[],
): { productId: string; qty: number; customer: string } | null {
  const normalized = normalizeDigits(transcript).replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const product = [...products]
    .sort((a, b) => String(b["name"]).length - String(a["name"]).length)
    .find((item) => normalized.includes(String(item["name"])));
  if (!product) return null;

  const quantityMatch = normalized.match(
    /(?:အရေအတွက်|အုပ်(?:စ်)?|ပွဲ|ယာ|ခု|ပေါင်း)?\s*(\d+(?:\.\d+)?)\s*(?:ခု|ပွဲ|ယာ|အုပ်|ပေါင်း)?/,
  );
  const qty = quantityMatch ? Number(quantityMatch[1]) : 1;
  if (!Number.isFinite(qty) || qty <= 0) return null;

  let customer = "";
  const customerMatch = normalized.match(/(?:ဖောက်သည်|ဝယ်သူ)\s*([^\d၊၊။]+?)(?:\s+(?:ဝယ်|ယူ|မှာ|ပေး|ထည့်))/);
  if (customerMatch) customer = customerMatch[1].replace(/(?:က|ကို)\s*$/, "").trim();

  return { productId: product.id, qty, customer };
}

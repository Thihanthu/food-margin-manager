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

const builtInProductAliases: Record<string, string[]> = {
  လက်ဖက်ရည်: ["အထိုက် ရေ"],
};

export function normalizeDigits(text: string): string {
  return text.replace(/[၀-၉]/g, (digit) => String(burmeseDigits[digit] ?? digit));
}

function editDistance(left: string[], right: string[]): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function findProduct(transcript: string, products: Row[]): Row | undefined {
  const normalize = (value: string) => value.normalize("NFC").replace(/\s+/g, "");
  const normalizedTranscript = normalize(transcript);
  const exactMatches = products
    .flatMap((product) => {
      const name = String(product["name"] ?? "");
      const aliases = String(product["voiceAliases"] ?? "").split(/[၊,\n]+/);
      return [name, ...(builtInProductAliases[name] ?? []), ...aliases]
        .map((term) => ({ product, term: normalize(term.trim()) }))
        .filter(({ term }) => term && normalizedTranscript.includes(term));
    })
    .sort((a, b) => b.term.length - a.term.length);
  if (exactMatches.length) {
    const bestLength = exactMatches[0].term.length;
    const bestMatches = exactMatches.filter((match) => match.term.length === bestLength);
    return new Set(bestMatches.map((match) => match.product.id)).size === 1
      ? bestMatches[0].product
      : undefined;
  }

  const text = Array.from(normalizedTranscript);
  let closest: { product: Row; distance: number } | undefined;
  let tied = false;
  for (const product of products) {
    const name = Array.from(normalize(String(product["name"])));
    if (name.length < 5) continue;
    const maxDistance = Math.max(1, Math.floor(name.length * 0.15));
    let bestDistance = Number.POSITIVE_INFINITY;
    for (
      let windowLength = Math.max(1, name.length - maxDistance);
      windowLength <= name.length + maxDistance;
      windowLength++
    ) {
      for (let start = 0; start + windowLength <= text.length; start++) {
        const distance = editDistance(name, text.slice(start, start + windowLength));
        if (distance < bestDistance) bestDistance = distance;
        if (bestDistance === 0) break;
      }
      if (bestDistance === 0) break;
    }
    if (bestDistance > maxDistance) continue;
    if (!closest || bestDistance < closest.distance) {
      closest = { product, distance: bestDistance };
      tied = false;
    } else if (bestDistance === closest.distance && product.id !== closest.product.id) {
      tied = true;
    }
  }
  return tied ? undefined : closest?.product;
}

export function parseVoiceSale(
  transcript: string,
  products: Row[],
  customers: Row[] = [],
): { productId: string; qty: number; customer: string } | null {
  const normalized = normalizeDigits(transcript).normalize("NFC").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const product = findProduct(normalized, products);
  if (!product) return null;
  const qty = parseVoiceQuantity(normalized);
  if (qty === null) return null;

  const customer = parseVoiceCustomer(normalized, customers);

  return { productId: product.id, qty, customer };
}

export function parseVoiceCustomer(transcript: string, customers: Row[] = []): string {
  const normalize = (value: string) => value.normalize("NFC").replace(/\s+/g, "");
  const normalizedTranscript = normalize(transcript);
  const matchingCustomer = customers
    .flatMap((customer) => {
      const aliases = String(customer["voiceAliases"] ?? "").split(/[၊,\n]+/);
      return [String(customer["name"] ?? ""), ...aliases]
        .map((term) => ({ customer, term: normalize(term.trim()) }))
        .filter(({ term }) => term && normalizedTranscript.includes(term));
    })
    .sort((a, b) => b.term.length - a.term.length);
  if (matchingCustomer.length) {
    const bestLength = matchingCustomer[0].term.length;
    const bestMatches = matchingCustomer.filter((match) => match.term.length === bestLength);
    if (new Set(bestMatches.map((match) => match.customer.id)).size === 1) {
      return String(bestMatches[0].customer["name"] ?? "");
    }
  }

  const customerMatch = transcript
    .normalize("NFC")
    .match(/(?:ဖောက်သည်|ဝယ်သူ)\s*([^\d၊၊။]+?)(?:\s+(?:ဝယ်|ယူ|မှာ|ပေး|ထည့်))/);
  return customerMatch ? customerMatch[1].replace(/(?:က|ကို)\s*$/, "").trim() : "";
}

export function parseVoiceQuantity(transcript: string): number | null {
  const normalized = normalizeDigits(transcript).normalize("NFC").replace(/\s+/g, " ").trim();
  const digitMatch = normalized.match(
    /(?:အရေအတွက်|အုပ်(?:စ်)?|ပွဲ|ယာ|ခု|ပေါင်း)?\s*(\d+(?:\.\d+)?)\s*(?:ခု|ပွဲ|ယာ|အုပ်|ပေါင်း)?/,
  );
  const spokenNumbers: Record<string, number> = {
    တစ်ဆယ်: 10,
    ဆယ်: 10,
    ခုနစ်: 7,
    ခုနှစ်: 7,
    ခြောက်: 6,
    ကိုး: 9,
    ရှစ်: 8,
    ငါး: 5,
    လေး: 4,
    သုံး: 3,
    နှစ်: 2,
    တစ်: 1,
  };
  const spokenNumber = Object.keys(spokenNumbers).find((word) =>
    new RegExp(`${word}\\s*(?:ခု|ပွဲ|ယာ|အုပ်|ခွက်)?`).test(normalized),
  );
  const qty = digitMatch ? Number(digitMatch[1]) : spokenNumber ? spokenNumbers[spokenNumber] : 1;
  return Number.isFinite(qty) && qty > 0 ? qty : null;
}

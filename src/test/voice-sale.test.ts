import { describe, expect, it } from "vitest";
import { normalizeDigits, parseVoiceSale } from "@/lib/voice-sale";
import type { Row } from "@/lib/store";

const products: Row[] = [
  { id: "tea", name: "လက်ဖက်ရည်", price: 1000 },
  { id: "noodles", name: "မုန့်ဟင်းခါး", price: 2500 },
];

describe("Myanmar voice sale parsing", () => {
  it("normalizes Burmese digits", () => {
    expect(normalizeDigits("ပွဲ၂")).toBe("ပွဲ2");
  });

  it("matches a spoken product and quantity", () => {
    expect(parseVoiceSale("မုန့်ဟင်းခါး ၂ပွဲ", products)).toEqual({
      productId: "noodles",
      qty: 2,
      customer: "",
    });
  });

  it("defaults quantity to one", () => {
    expect(parseVoiceSale("လက်ဖက်ရည် တစ်ခွက်", products)).toEqual({
      productId: "tea",
      qty: 1,
      customer: "",
    });
  });

  it("rejects unknown products", () => {
    expect(parseVoiceSale("နံနေးသီး စား", products)).toBeNull();
  });
});

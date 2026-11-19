import { describe, expect, it } from "vitest";
import { normalizeDigits, parseVoiceQuantity, parseVoiceSale } from "@/lib/voice-sale";
import type { Row } from "@/lib/store";

const products: Row[] = [
  { id: "tea", name: "လက်ဖက်ရည်", price: 1000 },
  { id: "noodles", name: "မုန့်ဟင်းခါး", price: 2500, voiceAliases: "ခေါက်ဆွဲ" },
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

  it("uses the saved product spelling when the transcript has a small spelling error", () => {
    expect(parseVoiceSale("မုန့်ဟင်းခါးး ၂ပွဲ", products)).toEqual({
      productId: "noodles",
      qty: 2,
      customer: "",
    });
  });

  it("corrects the known tea misrecognition to its canonical product name", () => {
    expect(parseVoiceSale("အထိုက် ရေ ၂ခွက်", products)).toEqual({
      productId: "tea",
      qty: 2,
      customer: "",
    });
  });

  it("maps a saved voice alias to the canonical product name", () => {
    expect(parseVoiceSale("ခေါက်ဆွဲ ၂ပွဲ", products)).toEqual({
      productId: "noodles",
      qty: 2,
      customer: "",
    });
  });

  it("maps a saved customer name to its canonical spelling", () => {
    expect(
      parseVoiceSale("မောင်မောင် လက်ဖက်ရည် ၂ခွက်", products, [{ id: "customer-1", name: "မောင်မောင်" }]),
    ).toEqual({
      productId: "tea",
      qty: 2,
      customer: "မောင်မောင်",
    });
  });

  it("defaults quantity to one", () => {
    expect(parseVoiceSale("လက်ဖက်ရည် တစ်ခွက်", products)).toEqual({
      productId: "tea",
      qty: 1,
      customer: "",
    });
  });

  it("parses Burmese number words", () => {
    expect(parseVoiceSale("လက်ဖက်ရည် နှစ်ခွက်", products)).toEqual({
      productId: "tea",
      qty: 2,
      customer: "",
    });
  });

  it("parses quantity separately when the product must be selected manually", () => {
    expect(parseVoiceQuantity("အရေအတွက် နှစ်ခွက်")).toBe(2);
  });

  it("rejects unknown products", () => {
    expect(parseVoiceSale("နံနေးသီး စား", products)).toBeNull();
  });
});

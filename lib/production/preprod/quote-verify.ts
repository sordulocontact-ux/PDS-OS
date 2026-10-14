// « Lire le devis avec PO » (PROD-014): what the code keeps of the model's
// reading. A line stays only when its passage is in the quote; an amount
// or a quantity only when its digits are in the quote. Read from an image,
// nothing can be checked: every line is kept, flagged « à vérifier ».
// Pure, client-safe.

import type { ProductionQuoteOutput } from "@/lib/ai/schemas/production-quote";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { normalizeSearch } from "@/lib/utils/search";

import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from "./types";

export type QuoteLineProposal = {
  key: string;
  label: string;
  category: EquipmentCategory;
  quantity: number | null;
  priceCents: number | null;
  // The passage it was read from.
  quote: string;
  // A value could not be found in the quote (or the quote is an image).
  uncertain: boolean;
  // A line of the list with the same category and label: updated, never
  // doubled.
  existingId: string | null;
};

export type QuoteProposals = {
  supplier: string | null;
  depositCents: number | null;
  conditions: string | null;
  taxes: string | null;
  lines: QuoteLineProposal[];
  // Read from an image: nothing could be checked against a text.
  fromImage: boolean;
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function verifyQuote(
  output: ProductionQuoteOutput,
  text: string | null,
  existing: { id: string; category: string; label: string }[],
): QuoteProposals {
  const haystack = text ? fold(text) : null;
  const digits = new Set(text?.match(/\d+/g) ?? []);
  const found = (quote: string) =>
    haystack === null ||
    (fold(quote).length > 0 && haystack.includes(fold(quote)));
  const said = (value: string) =>
    text === null || (value.match(/\d+/g) ?? []).every((n) => digits.has(n));
  const keep = (f: { value: string; quote: string } | null | undefined) =>
    f && found(f.quote) && said(f.value) ? f.value.trim() : null;
  const money = (value: string | null | undefined) => {
    if (!value || !said(value)) return null;
    const cleaned = value.replace(/[^\d,.\s]/g, "").trim();
    const cents = parseEurosToCents(cleaned);
    return cents === undefined || cents === null ? null : cents;
  };

  const deposit = keep(output.deposit);
  const lines = output.lines.flatMap((line, index) => {
    if (!found(line.quote) || !line.label.trim()) return [];
    const category = (EQUIPMENT_CATEGORIES as readonly string[]).includes(
      line.category,
    )
      ? (line.category as EquipmentCategory)
      : "other";
    const quantityText = line.quantity?.trim() ?? null;
    const quantity =
      quantityText && said(quantityText) && /^\d{1,4}$/.test(quantityText)
        ? Number(quantityText)
        : null;
    const priceCents = money(line.price);
    const label = line.label.trim().slice(0, 200);
    const twin = existing.find(
      (e) =>
        e.category === category &&
        normalizeSearch(e.label) === normalizeSearch(label),
    );
    return [
      {
        key: `line-${index}`,
        label,
        category,
        quantity:
          quantity && quantity >= 1 && quantity <= 1000 ? quantity : null,
        priceCents,
        quote: line.quote,
        uncertain:
          text === null ||
          (quantityText !== null && quantity === null) ||
          (!!line.price && priceCents === null),
        existingId: twin?.id ?? null,
      },
    ];
  });
  return {
    supplier: keep(output.supplier)?.slice(0, 200) ?? null,
    depositCents: deposit ? money(deposit) : null,
    conditions: keep(output.conditions)?.slice(0, 1000) ?? null,
    taxes: keep(output.taxes)?.slice(0, 200) ?? null,
    lines,
    fromImage: text === null,
  };
}

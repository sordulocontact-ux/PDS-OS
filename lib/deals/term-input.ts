// A term's value from its form, and back (BIZ 3). Client-safe: the same
// field names as components/deals/term-value-fields.tsx.

import type { TermFormat, TermValue } from "@/lib/deals/terms";
import { SPLIT_ROLES, exactShare, unitsOf } from "@/lib/legal/splits/shares";
import { amountInput, parseAmount } from "@/lib/utils/money";

const text = (data: FormData, name: string) =>
  String(data.get(name) ?? "").trim();

/** The value typed in the form, or null when it is missing or unreadable
 * (the form then says it in red). */
export function readTermValue(
  format: TermFormat,
  data: FormData,
): TermValue | null {
  switch (format) {
    case "text": {
      const value = text(data, "text");
      return value ? { text: value } : null;
    }
    case "percent": {
      const units = unitsOf(text(data, "percent"));
      return units === null ? null : { units };
    }
    case "money": {
      const cents = parseAmount(text(data, "amount"));
      const mode = text(data, "mode");
      return cents === null || (mode !== "advance" && mode !== "fee")
        ? null
        : { mode, cents };
    }
    case "amount": {
      const cents = parseAmount(text(data, "amount"));
      return cents === null ? null : { cents };
    }
    case "yesno": {
      const yes = text(data, "yesno");
      if (yes !== "yes" && yes !== "no") return null;
      return { yes: yes === "yes", detail: text(data, "detail") || null };
    }
    case "split": {
      const entries = SPLIT_ROLES.flatMap((role) => {
        const units = unitsOf(text(data, `share-${role}`));
        return units === null ? [] : [{ role, units }];
      });
      return entries.length > 0 ? { entries } : null;
    }
  }
}

/** The fields' starting values from the stored one. */
export function termInputs(
  format: TermFormat,
  value: TermValue | null,
): Record<string, string> {
  if (!value) return {};
  switch (format) {
    case "text":
      return { text: (value as TermValue<"text">).text };
    case "percent":
      return { percent: exactShare((value as TermValue<"percent">).units) };
    case "money": {
      const v = value as TermValue<"money">;
      return { amount: amountInput(v.cents), mode: v.mode };
    }
    case "amount":
      return { amount: amountInput((value as TermValue<"amount">).cents) };
    case "yesno": {
      const v = value as TermValue<"yesno">;
      return { yesno: v.yes ? "yes" : "no", detail: v.detail ?? "" };
    }
    case "split":
      return Object.fromEntries(
        (value as TermValue<"split">).entries.map((e) => [
          `share-${e.role}`,
          exactShare(e.units),
        ]),
      );
  }
}

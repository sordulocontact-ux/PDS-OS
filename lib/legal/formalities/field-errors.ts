// What the dossier still misses, said under each field once « Valider le
// dossier » is tried (Sacha, 07/10/2026). The codes come from
// formality_missing (SQL), the only judge; one stops being shown as soon as
// the value on screen answers it, so a field turns back to normal while it
// is being fixed. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import { FULL, totalUnits, unitsOf } from "@/lib/legal/splits/shares";

export type DossierErrors = {
  // By field key (title, duration, creators, dep_dr, arrangement,
  // publishing_contract).
  fields: Record<string, string>;
  // By creator's position, from 0.
  creators: Record<number, { last_name?: string; quality?: string }>;
  phono?: string;
  count: number;
};

const blank = (value: unknown) =>
  typeof value !== "string" || value.trim() === "";

export function dossierErrors(
  missing: string[],
  values: Record<string, unknown>,
  edited: ReadonlySet<string>,
): DossierErrors {
  const t = fr.legalFormalities.fieldErrors;
  const creators = (values.creators as Creator[] | null) ?? [];
  const publishers = (values.publishers as Publisher[] | null) ?? [];
  const contract = values.publishing_contract as {
    provided?: boolean;
    rubric_g?: string;
  } | null;
  const out: DossierErrors = { fields: {}, creators: {}, count: 0 };
  const field = (key: string, message: string) => {
    if (out.fields[key]) return;
    out.fields[key] = message;
    out.count += 1;
  };
  const creator = (i: number, key: "last_name" | "quality", text: string) => {
    out.creators[i] = { ...out.creators[i], [key]: text };
    out.count += 1;
  };

  for (const code of missing) {
    const [what, arg = ""] = code.split(":");
    const index = Number(arg) - 1;
    switch (what) {
      case "title":
      case "duration":
        if (blank(values[what])) field(what, t[what]);
        break;
      case "creators":
        if (creators.length === 0) field("creators", t.creators);
        break;
      case "creator_name":
        if (creators[index] && blank(creators[index].last_name))
          creator(index, "last_name", t.creator_name);
        break;
      case "creator_quality":
        if (creators[index] && !creators[index].quality)
          creator(index, "quality", t.creator_quality);
        break;
      case "phono_total": {
        const total = totalUnits(
          [...creators, ...publishers].map((p) =>
            unitsOf(p.phono.replace(",", ".") || "0"),
          ),
        );
        if (total !== FULL) {
          out.phono = t.phono_total;
          out.count += 1;
        }
        break;
      }
      case "dep_dr":
        if (!(values.dep_dr as { choice?: string } | null)?.choice)
          field("dep_dr", t.dep_dr);
        break;
      case "arrangement":
        if (!(values.arrangement as { scope?: string } | null)?.scope)
          field("arrangement", t.arrangement);
        break;
      case "publishing_contract":
        if (!contract?.provided)
          field("publishing_contract", t.publishing_contract);
        break;
      case "rubric_g":
        if (!contract?.provided && blank(contract?.rubric_g))
          field("publishing_contract", t.rubric_g);
        break;
      case "to_verify":
        // Publishers are edited in the creators' block.
        if (!edited.has(arg))
          field(arg === "publishers" ? "creators" : arg, t.to_verify);
        break;
      // Borrowings and the 5 / 3 caps are not a field: the list above the
      // dossier says them.
    }
  }
  return out;
}

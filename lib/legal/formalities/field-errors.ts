// What the dossier still misses, said under each field once « Valider le
// dossier » is tried (Sacha, 07/10/2026). The codes come from
// formality_missing (SQL), the only judge; one stops being shown as soon as
// the value on screen answers it, so a field turns back to normal while it
// is being fixed. Pure, client-safe.

import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { answeredOnScreen } from "@/lib/legal/formalities/answered";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import type { FieldStateEntry } from "@/lib/legal/formalities/field-states";
import {
  CATEGORY_OF,
  categoryTotal,
  membersOf,
  type ShareCategory,
} from "@/lib/legal/formalities/participants";
import { FULL } from "@/lib/legal/splits/shares";

const fr = { legalFormalities };

export type DossierErrors = {
  // By field key (title, duration, creators, dep_dr, dep_dr_check,
  // first_exploitation, arrangement, publishing_contract).
  fields: Record<string, string>;
  // By participant's position, from 0.
  creators: Record<
    number,
    {
      last_name?: string;
      first_name?: string;
      roles?: string;
      confirm?: string;
    }
  >;
  // By publisher's position, from 0 (JUR-24).
  publishers: Record<number, { name?: string; link?: string; label?: string }>;
  // A category whose shares do not make 100 % (retour d'Ibé du 02/11/2026).
  sharing: Partial<Record<ShareCategory, string>>;
  count: number;
};

export function dossierErrors(
  missing: string[],
  values: Record<string, unknown>,
  edited: ReadonlySet<string>,
): DossierErrors {
  const t = fr.legalFormalities.fieldErrors;
  const creators = (values.creators as Creator[] | null) ?? [];
  const publishers = (values.publishers as Publisher[] | null) ?? [];
  const members = membersOf(creators, publishers);
  const out: DossierErrors = {
    fields: {},
    creators: {},
    publishers: {},
    sharing: {},
    count: 0,
  };
  const category = (cat: ShareCategory) => {
    if (out.sharing[cat] || categoryTotal(members[cat]) === FULL) return;
    out.sharing[cat] = t.category_total;
    out.count += 1;
  };
  const field = (key: string, message: string) => {
    if (out.fields[key]) return;
    out.fields[key] = message;
    out.count += 1;
  };
  const creator = (
    i: number,
    key: "last_name" | "first_name" | "roles" | "confirm",
    text: string,
  ) => {
    out.creators[i] = { ...out.creators[i], [key]: text };
    out.count += 1;
  };

  for (const code of missing) {
    const [what, arg = ""] = code.split(":");
    const index = Number(arg) - 1;
    // Fixed on screen since: back to normal while it is being fixed.
    if (what !== "to_verify" && answeredOnScreen(code, values)) continue;
    switch (what) {
      case "title":
      case "duration":
      case "genre":
      case "first_exploitation":
        field(what, t[what]);
        break;
      // JUR-02: the DEP / DR shares computed by the code, checked by a person.
      case "dep_dr_check":
        field("dep_dr_check", t.dep_dr_check);
        break;
      case "creators":
        field("creators", t.creators);
        break;
      case "creator_name":
        creator(index, "last_name", t.creator_name);
        break;
      case "creator_first":
        creator(index, "first_name", t.creator_first);
        break;
      case "publisher_name":
        out.publishers[index] = { name: t.publisher_name };
        out.count += 1;
        break;
      case "publisher_link":
        out.publishers[index] = {
          ...out.publishers[index],
          link: t.publisher_link,
        };
        out.count += 1;
        break;
      case "creator_role":
        creator(index, "roles", t.creator_role);
        break;
      case "main_artist_role":
        creator(index, "confirm", t.main_artist_role);
        break;
      // A share left empty is a category short of 100 %.
      case "creator_share":
        for (const role of creators[index]?.roles ?? [])
          category(CATEGORY_OF[role]);
        break;
      case "author_total":
        category("author");
        break;
      case "composer_total":
        category("composer");
        break;
      case "publisher_total":
        category("publisher");
        break;
      case "publishers_choice":
        field("publishers", t.publishers_choice);
        break;
      case "publisher_label":
        out.publishers[index] = {
          ...out.publishers[index],
          label: t.publisher_label,
        };
        out.count += 1;
        break;
      case "phono_split":
        field("phono_split", t.phono_split);
        break;
      case "dep_dr":
        field("dep_dr", t.dep_dr);
        break;
      case "arrangement":
        field("arrangement", t.arrangement);
        break;
      case "publishing_contract":
        field("publishing_contract", t.publishing_contract);
        break;
      case "rubric_g":
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

/** The values still « À vérifier » (proposed from a source, computed by the
 * code, or reopened by the SACEM) said in red on their own field once
 * « Générer la version à signer » is tried: the refusal counted them without
 * saying where they were (Sacha, 10/11/2026). A value confirmed or changed
 * since is no longer proposed, so its field turns back to normal. */
export function withToConfirm(
  errors: DossierErrors,
  items: FieldStateEntry[],
  sourceOf: (key: string) => string | null,
): DossierErrors {
  const t = fr.legalFormalities.fieldErrors;
  const out = { ...errors, fields: { ...errors.fields } };
  for (const item of items) {
    if (item.state !== "proposed") continue;
    const [key, message] =
      item.key === "dep_dr"
        ? ["dep_dr_check", t.dep_dr_check]
        : [
            item.key,
            item.confirmable ? t.to_confirm(sourceOf(item.key)) : t.to_verify,
          ];
    if (out.fields[key]) continue;
    out.fields[key] = message;
    out.count += 1;
  }
  return out;
}

// What the dossier still misses, said under each field once « Valider le
// dossier » is tried (Sacha, 07/10/2026). The codes come from
// formality_missing (SQL), the only judge; one stops being shown as soon as
// the value on screen answers it, so a field turns back to normal while it
// is being fixed. Pure, client-safe.

import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type {
  Creator,
  PhonoSplit,
  Publisher,
} from "@/lib/legal/formalities/definition";
import {
  categoryTotal,
  membersOf,
  partsHold,
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
  const split = (values.phono_split as PhonoSplit | null) ?? {};
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
    switch (what) {
      case "title":
      case "duration":
      case "genre":
      case "first_exploitation":
        if (blank(values[what])) field(what, t[what]);
        break;
      // JUR-02: the DEP / DR shares computed by the code, checked by a person.
      case "dep_dr_check":
        if (!(values.dep_dr as { checked?: boolean } | null)?.checked)
          field("dep_dr_check", t.dep_dr_check);
        break;
      case "creators":
        if (creators.length === 0) field("creators", t.creators);
        break;
      case "creator_name":
        if (creators[index] && blank(creators[index].last_name))
          creator(index, "last_name", t.creator_name);
        break;
      case "creator_first":
        if (
          creators[index] &&
          blank(creators[index].first_name) &&
          blank(creators[index].pseudonym)
        )
          creator(index, "first_name", t.creator_first);
        break;
      case "publisher_name":
        if (publishers[index] && blank(publishers[index].name)) {
          out.publishers[index] = { name: t.publisher_name };
          out.count += 1;
        }
        break;
      case "publisher_link":
        if (publishers[index] && !(publishers[index].represents ?? []).length) {
          out.publishers[index] = {
            ...out.publishers[index],
            link: t.publisher_link,
          };
          out.count += 1;
        }
        break;
      case "creator_role":
        if (
          creators[index] &&
          !creators[index].performer_only &&
          creators[index].roles.length === 0
        )
          creator(index, "roles", t.creator_role);
        break;
      case "main_artist_role":
        if (creators[index]?.main_artist && !creators[index].confirmed)
          creator(index, "confirm", t.main_artist_role);
        break;
      // A share left empty is a category short of 100 %.
      case "creator_share":
        for (const role of creators[index]?.roles ?? [])
          category(
            role === "author" || role === "adapter" ? "author" : "composer",
          );
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
        if (publishers.length === 0 && !split.no_publisher)
          field("publishers", t.publishers_choice);
        break;
      case "publisher_label":
        if (publishers[index]) {
          out.publishers[index] = {
            ...out.publishers[index],
            label: t.publisher_label,
          };
          out.count += 1;
        }
        break;
      case "phono_split":
        if (!partsHold(members, split)) field("phono_split", t.phono_split);
        break;
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

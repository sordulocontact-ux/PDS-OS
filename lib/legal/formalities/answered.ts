// Whether a code of formality_missing (SQL) is already answered by the values
// on screen, before they are saved. The SQL stays the only judge of the
// dossier; this only stops a « à faire » from staying up while the person has
// just filled it (a first name, a pseudonym, a role…). Codes that only the
// database can judge (a publisher that is a label in the Réseau, a borrowing,
// a field reopened by the SACEM) are never answered here. Pure, client-safe.

import type {
  Creator,
  PhonoSplit,
  Publisher,
} from "@/lib/legal/formalities/definition";
import {
  CATEGORY_OF,
  categoryTotal,
  membersOf,
  onBulletin,
  partsHold,
  type ShareCategory,
} from "@/lib/legal/formalities/participants";
import { FULL, unitsOf } from "@/lib/legal/splits/shares";

const blank = (value: unknown) =>
  typeof value !== "string" || value.trim() === "";

const positive = (text: string | undefined) =>
  (text ? (unitsOf(text.replace(",", ".")) ?? 0) : 0) > 0;

export function answeredOnScreen(
  code: string,
  values: Record<string, unknown>,
): boolean {
  const creators = (values.creators as Creator[] | null) ?? [];
  const publishers = (values.publishers as Publisher[] | null) ?? [];
  const split = (values.phono_split as PhonoSplit | null) ?? {};
  const contract = values.publishing_contract as {
    provided?: boolean;
    rubric_g?: string;
  } | null;
  const [what, arg = ""] = code.split(":");
  const c = creators[Number(arg) - 1];
  const p = publishers[Number(arg) - 1];
  const members = () => membersOf(creators, publishers);
  const held = (cat: ShareCategory) => {
    const list = members()[cat];
    return list.length === 0 || categoryTotal(list) === FULL;
  };

  switch (what) {
    case "title":
    case "duration":
    case "genre":
    case "first_exploitation":
      return !blank(values[what]);
    case "dep_dr":
      return Boolean((values.dep_dr as { choice?: string } | null)?.choice);
    case "dep_dr_check":
      return Boolean((values.dep_dr as { checked?: boolean } | null)?.checked);
    case "creators":
      return creators.some(onBulletin);
    case "creators_max":
      return creators.filter(onBulletin).length <= 5;
    case "publishers_max":
      return publishers.length <= 3;
    // A participant removed since: nothing left to fill on that line.
    case "creator_name":
      return !c || !blank(c.last_name);
    case "creator_first":
      return !c || !blank(c.first_name) || !blank(c.pseudonym);
    case "creator_role":
      return !c || Boolean(c.performer_only) || c.roles.length > 0;
    case "main_artist_role":
      return !c?.main_artist || Boolean(c.confirmed);
    case "creator_share":
      return (
        !c || !onBulletin(c) || c.roles.every((r) => positive(c.shares[r]))
      );
    case "author_total":
      return held(CATEGORY_OF.author);
    case "composer_total":
      return held(CATEGORY_OF.composer);
    case "publisher_total":
      return held("publisher");
    case "publishers_choice":
      return publishers.length > 0 || Boolean(split.no_publisher);
    case "publisher_name":
      return !p || !blank(p.name);
    case "publisher_link":
      return !p || (p.represents ?? []).length > 0;
    // Judged from the Réseau: only gone with the publisher itself.
    case "publisher_label":
      return !p;
    case "phono_split":
      return partsHold(members(), split);
    case "arrangement":
      return (
        Boolean((values.arrangement as { scope?: string } | null)?.scope) ||
        !creators.some((x) => x.roles.includes("arranger"))
      );
    // Required while only publishers sign.
    case "publishing_contract":
      return (
        Boolean(contract?.provided) ||
        creators.some((x) => onBulletin(x) && x.signs)
      );
    case "rubric_g":
      return Boolean(contract?.provided) || !blank(contract?.rubric_g);
    default:
      return false;
  }
}

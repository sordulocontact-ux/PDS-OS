import "server-only";

import type { DraftChange } from "@/lib/assistant/drafts";
import { formatDay } from "@/lib/assistant/facts";
import { change } from "@/lib/assistant/propose/match";
import { parseSaidDate, type Verbatim } from "@/lib/assistant/verbatim";
import {
  formatIswc,
  formatShare,
  normalizeIswc,
  type ContributorRole,
  type DeclarationStatus,
  type SessionKind,
  type SplitKind,
  type SplitRole,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

// The values of a title item draft (propose_title_item), by form field name,
// and the card's lines. Numbers, dates, codes and statuses come only from
// the user's words, read here (lib/assistant/verbatim.ts).

export type TitleItemInput = {
  name?: string;
  contributorRole?: ContributorRole;
  splitRole?: SplitRole;
  detail?: string;
  sessionKind?: SessionKind;
  date?: string;
  studio?: string;
  engineer?: string;
  performer?: string;
  notes?: string;
  share?: string;
  status?: string;
  reference?: string;
  iswc?: string;
  rightsHolder?: string;
  rightsYear?: string;
};

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** "33,33 %", "50%", "12.5" → "33,33" (the share field's format). */
function parseSaidShare(
  quote: string,
): { input: string; value: number } | null {
  const m = /^(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:%|pour ?cent|pourcents?)?$/.exec(
    fold(quote).trim(),
  );
  const value = m ? Number(m[1].replace(",", ".")) : NaN;
  return value >= 0.01 && value <= 100
    ? { input: m![1].replace(".", ","), value }
    : null;
}

const parseSaidYear = (quote: string) =>
  /^(19|20)\d{2}$/.test(quote.trim()) ? quote.trim() : null;

/** "déposée", "confirmée", "refusée" in the user's words. */
function parseSaidDeclarationStatus(quote: string): DeclarationStatus | null {
  const text = fold(quote);
  if (/refus|rejet/.test(text)) return "rejected";
  if (/confirm|valid|accept|enregistr/.test(text)) return "confirmed";
  if (/depos|declar|envoy|soumis/.test(text)) return "submitted";
  return null;
}

export function titleItemValues(
  item: string,
  input: TitleItemInput,
  verbatim: Verbatim,
  warnings: string[],
): { defaults: Record<string, string>; changes: DraftChange[] } {
  const p = fr.masterPage;
  const notSaid = fr.assistant.drafts.notSaid;
  const defaults: Record<string, string> = {};
  const changes: DraftChange[] = [];
  const set = (
    field: string,
    label: string,
    value: string | null | undefined,
    shown?: string,
  ) => {
    const text = value?.trim();
    if (!text) return;
    defaults[field] = text;
    change(changes, label, null, shown ?? text);
  };
  const said = <T>(
    value: string | undefined,
    label: string,
    parse: (q: string) => T | null,
  ): T | null => {
    const quote = verbatim.quote(value);
    const parsed = quote ? parse(quote) : null;
    if (value && parsed === null) warnings.push(notSaid(label));
    return parsed;
  };

  if (item === "contributor") {
    set("name", p.credits.fields.name, input.name);
    if (input.contributorRole)
      set(
        "role",
        p.credits.fields.role,
        input.contributorRole,
        p.credits.roles[input.contributorRole],
      );
    set("detail", p.credits.fields.detail, input.detail);
  } else if (item === "session") {
    if (input.sessionKind)
      set(
        "kind",
        p.sessions.fields.kind,
        input.sessionKind,
        p.sessions.kinds[input.sessionKind],
      );
    const date = said(input.date, p.sessions.fields.date, parseSaidDate);
    set(
      "date",
      p.sessions.fields.date,
      date,
      date ? formatDay(date) : undefined,
    );
    set("studio", p.sessions.fields.studio, input.studio);
    set("engineer", p.sessions.fields.engineer, input.engineer);
    set("notes", p.sessions.fields.notes, input.notes);
  } else if (item === "track") {
    set("name", p.tracks.fields.name, input.name);
    set("performer", p.tracks.fields.performer, input.performer);
  } else if (item === "split") {
    set("party", p.splits.fields.party, input.name);
    if (input.splitRole)
      set(
        "role",
        p.splits.fields.role,
        input.splitRole,
        p.splits.roles[input.splitRole],
      );
    const share = said(input.share, p.splits.fields.share, parseSaidShare);
    set(
      "share",
      p.splits.fields.share,
      share?.input,
      share ? formatShare(share.value) : undefined,
    );
  } else if (item === "rights") {
    const iswc = said(input.iswc, p.rights.fields.iswc, normalizeIswc);
    set("iswc", p.rights.fields.iswc, iswc ? formatIswc(iswc) : null);
    set("rightsHolder", p.rights.fields.rightsHolder, input.rightsHolder);
    set(
      "rightsYear",
      p.rights.fields.rightsYear,
      said(input.rightsYear, p.rights.fields.rightsYear, parseSaidYear),
    );
  } else if (item === "declaration") {
    const status = said(
      input.status,
      p.declarations.fields.status,
      parseSaidDeclarationStatus,
    );
    set(
      "status",
      p.declarations.fields.status,
      status,
      status ? p.declarations.statuses[status] : undefined,
    );
    set(
      "reference",
      p.declarations.fields.reference,
      said(input.reference, p.declarations.fields.reference, (q) => q.trim()),
    );
    const date = said(input.date, p.declarations.fields.date, parseSaidDate);
    set(
      "date",
      p.declarations.fields.date,
      date,
      date ? formatDay(date) : undefined,
    );
    set("notes", p.declarations.fields.notes, input.notes);
  }
  return { defaults, changes };
}

/** A new share's kind: said, else read from its role (authors are publishing). */
export function splitKindOf(
  kind: SplitKind | undefined,
  role: SplitRole | undefined,
): SplitKind {
  if (kind) return kind;
  return role && ["author", "composer", "publisher"].includes(role)
    ? "publishing"
    : "master";
}

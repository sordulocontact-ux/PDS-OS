// The launched Plan d'action as the prototype of 07/10/2026 drew it (Sacha,
// 08/10/2026: « presque comme sur le prototype »), lightened after the UX
// test of 09/10/2026 (≈ 250 actions for an EP): one line per person (their
// fiche, then their contract), per title (its split, then its SACEM
// bulletin) and per borrowing, each with the state of its most urgent step
// in a badge, the verb of what to do — done at once when it needs no input
// (`action`) — and the panel where every step is. Built from the
// tracked plan (groups, delegation) and each branch's own data (the fiche,
// the agreement, the split, the borrowing, the bulletin). Pure: the code
// classifies, nothing here is stored.

import { legal } from "@/lib/i18n/fr/legal";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatDate } from "@/lib/release/format";
import type { Clearance } from "@/lib/legal/clearance/types";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import type { FormRow } from "@/lib/legal/forms/queries";
import type { PlanItemKind } from "@/lib/legal/plan/proposal";
import type { TitleSplit } from "@/lib/legal/splits/queries";
import type { TrackGroup, TrackedItem } from "@/lib/legal/tracking/state";
import {
  agreementTone,
  clearanceTone,
  formalityTone,
  splitVersionTone,
  type Tone,
} from "@/lib/ui/state-tones";
import { formatInstant } from "@/lib/utils/instant";
import { ficheBadge } from "@/lib/legal/forms/state";

const fr = {
  legal,
  legalClearance,
  legalContracts,
  legalFormalities,
  legalForms,
  legalSplits,
  masterPage,
};

export type BoardGroup = TrackGroup | "done";

export type BoardPanel =
  | { kind: "fiche"; row: FormRow }
  | { kind: "mapping" }
  | { kind: "contract"; row: AgreementRow }
  | { kind: "split"; split: TitleSplit }
  | { kind: "clearance"; clearance: Clearance }
  | { kind: "sacem"; title: TitleFormality }
  | { kind: "link"; href: string }
  // A person's or a title's steps (BoardRow.steps), in order.
  | { kind: "steps" };

/** What a line's verb does at once, when the step needs nothing typed
 * (UX test of 09/10/2026: « Préparer la fiche » opened a panel with
 * « Préparer la fiche »). Run by the client, then the panel opens. */
export type RowAction =
  | { kind: "prepareFiche"; personKey: string }
  | { kind: "markSent"; formId: string }
  | { kind: "generateContract"; needId: string }
  | { kind: "submitContract"; contractId: string }
  | { kind: "proposeSplit"; versionId: string; title: string }
  | { kind: "openFormality"; masterId: string };

export type BoardRow = {
  id: string;
  section: PlanItemKind;
  group: BoardGroup;
  label: string;
  // The title it is about, as a tag.
  masterId: string | null;
  meta: string[];
  badge: { label: string; tone: Tone };
  verb: string;
  // The plan's action (delegation: who, by when).
  item: TrackedItem | null;
  panel: BoardPanel;
  action?: RowAction;
  // A person's or a title's steps, in order; the line shows the most
  // urgent one (its badge, verb, action, delegation).
  steps?: BoardRow[];
  // Which step of `steps` the line shows.
  current?: number;
};

export type BoardSection = {
  kind: PlanItemKind;
  title: string;
  why: string;
  after: string | null;
  rows: BoardRow[];
  done: number;
};

export type PlanBoard = {
  sections: BoardSection[];
  counts: Record<TrackGroup, number>;
  // The borrowings not secured: what blocks the release (ticket 08).
  blocking: BoardRow[];
  // What remains open besides the borrowings (fiches, contracts, splits,
  // SACEM): it does not block, but the release is not « atteint » with it
  // (UX test of 09/10/2026: « Atteint » with every contract unsigned).
  remaining: BoardRow[];
  secured: number;
  borrowings: number;
};

// In the order they unlock: the people (fiche, then contract) and the
// borrowings start together (ticket 07), the titles (split, then SACEM)
// follow.
const SECTIONS: Array<{
  kinds: PlanItemKind[];
  title: () => string;
  why: () => string;
}> = [
  {
    kinds: ["onboarding", "contract"],
    title: () => fr.legal.board.sections.people,
    why: () => fr.legal.board.why.people,
  },
  {
    kinds: ["clearance"],
    title: () => fr.legal.plan.groups.clearance,
    why: () => fr.legal.board.why.clearance,
  },
  {
    kinds: ["splits", "formality"],
    title: () => fr.legal.board.sections.titles,
    why: () => fr.legal.board.why.titles,
  },
];

// Most urgent first: what decides the line's group, badge and verb.
const URGENCY: BoardGroup[] = ["decision", "now", "waiting", "silent", "done"];

/**
 * One line per person and per title: their steps in order, shown by the
 * most urgent one. A step alone stays a line of its own (a borrowing, the
 * mapping, a contract without a fiche).
 */
function mergeSteps(
  rows: BoardRow[],
  mergeOf: Map<string, string>,
  forms: FormRow[],
): BoardRow[] {
  const t = fr.legal.board;
  const groups = new Map<string, BoardRow[]>();
  const lines: Array<BoardRow | string> = [];
  for (const row of rows) {
    const key = mergeOf.get(row.id);
    if (!key) {
      lines.push(row);
      continue;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
      lines.push(key);
    }
    groups.get(key)!.push(row);
  }
  const nameOf = new Map(forms.map((f) => [`person:${f.key}`, f.name]));
  return lines.map((line) => {
    if (typeof line !== "string") return line;
    const steps = groups.get(line)!;
    if (steps.length === 1) return steps[0];
    const current = steps.reduce(
      (best, step, i) =>
        URGENCY.indexOf(step.group) < URGENCY.indexOf(steps[best].group)
          ? i
          : best,
      0,
    );
    const shown = steps[current];
    const person = line.startsWith("person:");
    return {
      ...shown,
      id: line,
      section: steps[0].section,
      label: person ? (nameOf.get(line) ?? shown.label) : shown.label,
      meta: person ? steps[0].meta : shown.meta,
      badge: {
        ...shown.badge,
        label: `${t.stepOf[shown.panel.kind] ?? ""}${shown.badge.label}`,
      },
      panel: { kind: "steps" },
      steps,
      current,
    };
  });
}

const finished = (item: TrackedItem) =>
  item.current === "done" || item.current === "obsolete";
const groupOf = (item: TrackedItem): BoardGroup =>
  finished(item) ? "done" : item.group;

function metaOf(item: TrackedItem | null, extra: Array<string | null>) {
  const t = fr.legal.board;
  return [
    ...extra,
    item?.responsibleName ?? null,
    item?.dueOn ? t.due(formatDate(item.dueOn)) : null,
    item?.group === "waiting" && item.since
      ? t.since(formatInstant(item.since))
      : null,
  ].filter((x): x is string => !!x);
}

function ficheRow(row: FormRow, item: TrackedItem | null): BoardRow {
  const t = fr.legal.board;
  const group: BoardGroup =
    row.namesakeId || row.artistId
      ? "now"
      : ({
          none: "now",
          link_generated: "now",
          expired: "now",
          revoked: "now",
          sent: "waiting",
          // A complement asked waits for the person (JUR-06).
          action_required: row.complement ? "waiting" : "decision",
          complete: "done",
        }[row.state] as BoardGroup);
  return {
    id: `fiche:${row.key}`,
    section: "onboarding",
    group,
    label: row.name,
    masterId: null,
    meta: metaOf(item, [
      [
        ...row.creditRoles.map((r) => fr.masterPage.credits.roles[r]),
        // A featured artist: performer beside their credits.
        ...(row.formRoles.includes("performer")
          ? [fr.legalForms.roles.performer]
          : []),
      ].join(", "),
    ]),
    badge: row.namesakeId
      ? { label: t.namesake, tone: "warning" }
      : row.artistId
        ? { label: t.notInNetwork, tone: "warning" }
        : ficheBadge(row),
    verb: row.namesakeId
      ? t.verbs.link
      : row.artistId
        ? t.verbs.addToNetwork
        : group === "done" || group === "waiting"
          ? t.verbs.open
          : row.state === "link_generated"
            ? t.verbs.markSent
            : row.state === "action_required"
              ? t.verbs.review
              : t.verbs.prepareFiche,
    item,
    panel: { kind: "fiche", row },
    action:
      row.namesakeId || row.artistId
        ? undefined
        : row.state === "link_generated" && row.formId
          ? { kind: "markSent", formId: row.formId }
          : group === "now" && row.state !== "link_generated"
            ? { kind: "prepareFiche", personKey: row.key }
            : undefined,
  };
}

// The action a contract's verb does at once, if any.
function contractAction(row: AgreementRow): RowAction | undefined {
  if (row.state === "ready_to_generate" && row.needId)
    return { kind: "generateContract", needId: row.needId };
  if (row.state === "draft" && row.contract)
    return { kind: "submitContract", contractId: row.contract.id };
  return undefined;
}

function contractVerb(row: AgreementRow, canValidate: boolean) {
  const v = fr.legal.board.verbs;
  switch (row.state) {
    case "unmapped":
      return v.mapping;
    case "needs_info":
      return v.missing;
    case "ready_to_generate":
      return v.generate;
    case "draft":
      return v.submit;
    case "review_required":
      return canValidate ? v.validateDocument : v.open;
    case "ready_for_signature":
      return v.send;
    case "signature_pending":
      return v.deposit;
    default:
      return v.open;
  }
}

function clearanceVerb(c: Clearance, canValidate: boolean) {
  const v = fr.legal.board.verbs;
  const pending = c.terms.some((x) => x.status === "proposed");
  switch (c.status) {
    case "to_investigate":
    case "rightsholders_identified":
      return v.ask;
    case "contacted":
    case "waiting_external":
      return v.reply;
    case "negotiating":
      return pending ? (canValidate ? v.validateTerms : v.open) : v.reply;
    case "agreement_reached":
    case "document_pending":
      return v.sign;
    case "signed":
      return v.deposit;
    case "refused":
    case "action_required":
      return v.decide;
    default:
      return v.open;
  }
}

function splitView(split: TitleSplit) {
  const t = fr.legal.board;
  const states = fr.legalSplits.versionStates as Record<string, string>;
  if (split.active) {
    const lines = split.active.lines;
    const ok = lines.filter((l) => l.confirmation.state === "confirmed").length;
    const status = split.active.status;
    return {
      badge: {
        label:
          status === "proposed" || status === "partially_confirmed"
            ? t.confirmations(ok, lines.length)
            : (states[status] ?? status),
        tone: splitVersionTone[status],
      },
      verb: status === "disputed" ? t.verbs.decide : t.verbs.open,
    };
  }
  if (split.draft)
    return {
      badge: { label: states.draft, tone: splitVersionTone.draft },
      verb: t.verbs.proposeSplit,
    };
  return {
    badge: { label: t.toPropose, tone: "action" as Tone },
    verb: t.verbs.split,
  };
}

function formalityVerb(title: TitleFormality) {
  const v = fr.legal.board.verbs;
  switch (title.formality?.status) {
    case undefined:
    case "collecting_data":
      return v.fillBulletin;
    case "ready_to_generate":
      return v.generateBulletin;
    case "document_ready":
    case "signatures_pending":
      return v.signatures;
    case "ready_to_submit":
      return v.file;
    case "action_required":
    // Rejected: a new declaration to prepare (JUR-03).
    case "rejected":
      return v.correct;
    default:
      return v.open;
  }
}

export function planBoard(input: {
  projectId: string;
  items: TrackedItem[];
  forms: FormRow[];
  agreements: AgreementRow[];
  mappingApproved: boolean;
  splits: TitleSplit[];
  clearances: Clearance[];
  formalities: TitleFormality[];
  canValidate: boolean;
}): PlanBoard {
  const t = fr.legal.board;
  const rows: BoardRow[] = [];
  const itemOf = (key: string) => input.items.find((i) => i.key === key);
  const formOf = new Map(input.forms.map((f) => [f.key, f]));
  const labelOf = new Map(input.items.map((i) => [i.key, i.label]));

  // A line that waits for another action says which.
  const waiting = (item: TrackedItem, fallback: BoardRow["badge"]) => {
    if (item.current !== "blocked") return fallback;
    const names = item.dependsOn.flatMap((key) => labelOf.get(key) ?? []);
    return {
      label: names.length > 0 ? t.waitsFor(names.join(", ")) : item.reason,
      tone: "neutral" as Tone,
    };
  };

  // Which person or title a step belongs to (merged below).
  const mergeOf = new Map<string, string>();
  // Fiches: one per credited person.
  const onboarding = itemOf("onboarding") ?? null;
  for (const form of input.forms) {
    const row = ficheRow(form, onboarding);
    rows.push(row);
    mergeOf.set(row.id, `person:${form.key}`);
  }

  for (const item of input.items) {
    const [kind, ref] = [item.kind, item.key.slice(item.key.indexOf(":") + 1)];
    const base = {
      id: item.key,
      section: kind,
      group: groupOf(item),
      item,
      masterId: item.masterId,
    };
    if (kind === "onboarding") continue;
    if (kind === "contract") {
      const agreement = input.agreements.find((a) => a.key === ref);
      const form = formOf.get(ref);
      const blockedByFiche =
        item.current === "blocked" && form && form.state !== "complete";
      rows.push({
        ...base,
        label: item.subject ?? item.label,
        meta: metaOf(item, [item.detail]),
        badge: blockedByFiche
          ? { label: t.waitsFiche(form.name), tone: "neutral" }
          : agreement
            ? {
                label: fr.legalContracts.agreements.states[agreement.state],
                tone: agreementTone[agreement.state],
              }
            : waiting(item, { label: item.reason, tone: "neutral" }),
        verb: agreement
          ? contractVerb(agreement, input.canValidate)
          : t.verbs.open,
        panel: agreement
          ? { kind: "contract", row: agreement }
          : { kind: "link", href: item.sourceHref ?? "" },
        action:
          agreement && !blockedByFiche ? contractAction(agreement) : undefined,
      });
      mergeOf.set(item.key, `person:${ref}`);
      continue;
    }
    if (kind === "splits") {
      const split = input.splits.find((s) => s.masterId === ref);
      const view = split ? splitView(split) : null;
      rows.push({
        ...base,
        // The title is the line: no tag repeating it.
        label: split ? `« ${split.title} »` : (item.subject ?? item.label),
        masterId: null,
        meta: metaOf(item, [t.edition]),
        badge: waiting(
          item,
          view?.badge ?? { label: item.reason, tone: "neutral" },
        ),
        verb: view?.verb ?? t.verbs.open,
        panel: split
          ? { kind: "split", split }
          : { kind: "link", href: item.sourceHref ?? "" },
        action:
          split?.draft && item.current !== "blocked"
            ? {
                kind: "proposeSplit",
                versionId: split.draft.id,
                title: split.title,
              }
            : undefined,
      });
      mergeOf.set(item.key, `title:${ref}`);
      continue;
    }
    if (kind === "clearance") {
      const clearance = input.clearances.find((c) => c.id === ref);
      rows.push({
        ...base,
        label: clearance ? `« ${clearance.work} »` : item.label,
        meta: metaOf(item, [item.detail]),
        badge: clearance
          ? {
              label: fr.legalClearance.statuses[clearance.status],
              tone: clearanceTone[clearance.status],
            }
          : { label: item.reason, tone: "neutral" },
        verb: clearance
          ? clearanceVerb(clearance, input.canValidate)
          : t.verbs.open,
        panel: clearance
          ? { kind: "clearance", clearance }
          : { kind: "link", href: item.sourceHref ?? "" },
      });
      continue;
    }
    // formality: the SACEM bulletin of a title
    const title = input.formalities.find((f) => f.masterId === ref);
    const status = title?.formality?.status;
    rows.push({
      ...base,
      label: title ? `« ${title.title} »` : item.label,
      masterId: null,
      meta: metaOf(item, [t.bulletin]),
      badge: waiting(item, {
        label: status
          ? fr.legalFormalities.statuses[status]
          : fr.legalFormalities.statuses.none,
        tone: status ? formalityTone[status] : "neutral",
      }),
      verb: title ? formalityVerb(title) : t.verbs.open,
      panel: title
        ? { kind: "sacem", title }
        : { kind: "link", href: item.sourceHref ?? "" },
      action:
        title && !title.formality && item.current !== "blocked"
          ? { kind: "openFormality", masterId: title.masterId }
          : undefined,
    });
    mergeOf.set(item.key, `title:${ref}`);
  }

  // The mapping of the contracts: validated once for every person.
  if (
    !input.mappingApproved &&
    input.agreements.some((a) => a.state === "unmapped")
  )
    rows.unshift({
      id: "mapping",
      section: "contract",
      group: "decision",
      label: t.mapping,
      masterId: null,
      meta: [
        input.agreements
          .filter((a) => a.state === "unmapped")
          .map((a) => a.name)
          .join(", "),
      ],
      badge: {
        label: fr.legalContracts.agreements.states.unmapped,
        tone: agreementTone.unmapped,
      },
      verb: t.verbs.mapping,
      item: null,
      panel: { kind: "mapping" },
    });

  const lines = mergeSteps(rows, mergeOf, input.forms);
  const sections = SECTIONS.flatMap((section): BoardSection[] => {
    const theirs = lines.filter((r) => section.kinds.includes(r.section));
    if (theirs.length === 0) return [];
    return [
      {
        kind: section.kinds[0],
        title: section.title(),
        why: section.why(),
        after: null,
        rows: theirs,
        done: theirs.filter((r) => r.group === "done").length,
      },
    ];
  });
  const counts: Record<TrackGroup, number> = {
    now: 0,
    decision: 0,
    waiting: 0,
    silent: 0,
  };
  for (const row of lines)
    counts[row.group === "done" ? "silent" : row.group] += 1;
  const borrowings = lines.filter((r) => r.panel.kind === "clearance");
  const blocking = borrowings.filter(
    (r) =>
      r.panel.kind === "clearance" &&
      !["cleared", "abandoned"].includes(r.panel.clearance.status),
  );
  return {
    sections,
    counts,
    blocking,
    remaining: lines.filter(
      (r) => r.group !== "done" && r.panel.kind !== "clearance",
    ),
    secured: borrowings.length - blocking.length,
    borrowings: borrowings.length,
  };
}

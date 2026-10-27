import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMasterBrief } from "@/lib/master-workflow/brief";
import {
  BRIEF_DATES,
  type BriefDate,
  type BriefView,
} from "@/lib/master-workflow/brief-types";
import { proposeMasterCalendar } from "@/lib/master-workflow/calendar";
import { loadFramingDefaults } from "@/lib/master-workflow/framing-defaults";
import { loadBriefQuestions } from "@/lib/master-workflow/questions";
import type { BriefQuestionsView } from "@/lib/master-workflow/question-types";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { personName } from "@/lib/projects/types";
import { masterBriefRow } from "@/lib/master-workflow/shared-rows";
import { createClient } from "@/lib/supabase/server";

import { briefMissing, type BriefDesignation } from "./brief-rules";

export type BriefStepView = {
  view: BriefView;
  questions: BriefQuestionsView;
  saved: boolean;
  recordedAt: string | null;
  recordedBy: string | null;
  // Changed since it was recorded: « Modifications à enregistrer ».
  dirty: boolean;
  startMode: "direct" | "exchange" | null;
  // « Modifié par … » of each fact changed by hand.
  changedBy: Partial<Record<string, string>>;
  // Where each designation comes from (rule 22).
  designations: {
    mix: BriefDesignation | null;
    mastering: BriefDesignation | null;
    validator: BriefDesignation | null;
  };
  // The dates shown: the saved one, else the code's proposal.
  dates: Record<BriefDate, { value: string | null; proposed: boolean }>;
  masterFinalFromFraming: boolean;
  missing: string[];
  // The mix package left already (its date): changing the Brief changes
  // nothing for the engineer until it is sent again.
  sentAt: string | null;
};

const TEAM_ROLES = [
  "mix_engineer",
  "mastering_engineer",
  "creative_direction",
  "artistic_direction",
];

/**
 * The Brief step (proto `master-v2.html`): the brief saved or what the
 * project already knows, where each designation comes from, the proposed
 * dates, what is missing, whether it is recorded, and the questions.
 */
export async function loadBriefStep(
  project: {
    id: string;
    ownerPersonId: string | null;
    ownerName: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
  sentAt: string | null,
): Promise<BriefStepView> {
  const supabase = await createClient();
  const [view, questions, framing, row, team, creatives] = await Promise.all([
    loadMasterBrief(project, access),
    loadBriefQuestions(project, access),
    loadFramingDefaults(project.id),
    // Shared with the Master's other loaders in the same render.
    masterBriefRow(project.id),
    supabase
      .from("project_team_members")
      .select(
        "role_key, person_id, contact_id, display_name, source_quote, source_label, source_type, created_at",
      )
      .eq("project_id", project.id)
      .eq("review_status", "confirmed")
      .in("role_key", TEAM_ROLES),
    listProjectCreatives(project.id),
  ]);
  const saved = row.data !== null;
  const ids = Object.values(
    (row.data?.changed_by ?? {}) as Record<string, { by?: string }>,
  ).flatMap((m) => (m.by ? [m.by] : []));
  const people = ids.length
    ? ((
        await supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", [...new Set(ids)])
      ).data ?? [])
    : [];
  const nameOf = new Map(
    people.map((p) => [p.id, personName(p.first_name, p.last_name)]),
  );
  const changedBy: Partial<Record<string, string>> = {};
  for (const [field, mark] of Object.entries(
    (row.data?.changed_by ?? {}) as Record<string, { by?: string }>,
  ))
    if (mark.by && nameOf.get(mark.by)) changedBy[field] = nameOf.get(mark.by);

  const rows = team.data ?? [];
  const teamOf = (key: string) => rows.find((r) => r.role_key === key);
  const creativeMember =
    rows.find(
      (r) =>
        (r.role_key === "creative_direction" ||
          r.role_key === "artistic_direction") &&
        r.person_id,
    ) ?? null;
  const brief = view.brief;
  // Before the first save: the validator is the creative director the
  // Cadrage designated, else the project's, else its owner (rule 22).
  if (!saved) {
    // One engineer known and none for the mastering: the same one masters
    // (the common case, « Karim fait le mix et le master »), changeable.
    if (brief.mixContactId && !brief.masteringContactId)
      brief.masteringSameEngineer = true;
    const creative =
      creativeMember?.person_id ?? creatives[0]?.personId ?? null;
    if (creative && view.validators.some((v) => v.personId === creative))
      brief.validatorPersonId = creative;
  }
  const designation = (
    contactOrPerson: string | null,
    member: (typeof rows)[number] | undefined | null,
    fallback: BriefDesignation["kind"],
  ): BriefDesignation | null => {
    if (!contactOrPerson) return null;
    if (
      member &&
      (member.contact_id === contactOrPerson ||
        member.person_id === contactOrPerson)
    )
      return {
        kind: "framing",
        quote: member.source_quote,
        label: member.source_label,
      };
    return { kind: fallback, quote: null, label: null };
  };
  const proposal = proposeMasterCalendar(
    brief.dates.masterFinalDue ?? framing.masterFinalDue,
  );
  const dates = Object.fromEntries(
    BRIEF_DATES.map((key) => {
      const value = brief.dates[key];
      const proposed =
        key === "masterFinalDue"
          ? framing.masterFinalDue
          : (proposal?.[key] ?? null);
      return [
        key,
        value
          ? { value, proposed: false }
          : { value: proposed, proposed: proposed !== null },
      ];
    }),
  ) as BriefStepView["dates"];
  const recordedAt = row.data?.recorded_at ?? null;
  return {
    view,
    questions,
    saved,
    recordedAt,
    recordedBy: row.data?.recorder
      ? personName(row.data.recorder.first_name, row.data.recorder.last_name)
      : null,
    dirty:
      saved &&
      (!recordedAt ||
        (row.data?.content_changed_at ?? "") > (recordedAt ?? "")),
    startMode:
      row.data?.start_mode === "direct" || row.data?.start_mode === "exchange"
        ? row.data.start_mode
        : null,
    changedBy,
    designations: {
      mix: designation(
        brief.mixContactId,
        teamOf("mix_engineer"),
        view.brief.mixContactId && !saved ? "credited" : "chosen",
      ),
      mastering: designation(
        brief.masteringContactId,
        teamOf("mastering_engineer"),
        "chosen",
      ),
      validator: designation(
        brief.validatorPersonId,
        creativeMember,
        brief.validatorPersonId === project.ownerPersonId ? "owner" : "chosen",
      ),
    },
    dates,
    masterFinalFromFraming:
      framing.masterFinalDue !== null &&
      dates.masterFinalDue.value === framing.masterFinalDue,
    missing: briefMissing(brief),
    sentAt,
  };
}

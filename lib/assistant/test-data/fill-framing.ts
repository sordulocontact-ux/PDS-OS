import "server-only";

import {
  FAKE_BUDGET_CENTS,
  FAKE_CONSTRAINT,
  FAKE_FRAMING_TEXT,
  FAKE_FRAMING_TEXTS,
  FAKE_NEEDS,
  fakeTargetDate,
} from "@/lib/assistant/test-data/fake-framing";
import type { Step } from "@/lib/assistant/test-data/fill-master";
import { logged, type Supabase } from "@/lib/assistant/test-data/writes";
import type { Access } from "@/lib/auth/access";
import { assessFraming, type QuestionState } from "@/lib/framing/assess";
import {
  confirmLines,
  confirmedRow,
  type BriefRow,
} from "@/lib/framing/confirm";
import { QUESTIONS } from "@/lib/framing/dimensions";
import {
  loadFramingKnowledge,
  type FramingKnowledge,
} from "@/lib/framing/knowledge";
import { openFraming } from "@/lib/framing/open";
import { fr } from "@/lib/i18n/fr";
import type { ProjectDetail } from "@/lib/projects/types";

/**
 * Fills the Cadrage intelligent of a project with fake answers
 * (docs/ASSISTANT.md § 3 ter): opened if needed, then every question not
 * known yet is answered. What is already proposed (a call, the project
 * sheet, the titles) is confirmed with its source, the rest gets a value
 * written by code. A known or set-aside question is left alone. Same tables
 * as the screen, with the user's session: owner only, refused by RLS once
 * the Brief is with the validator.
 */

const manual = (value: unknown): BriefRow => ({
  value,
  status: "confirmed",
  source_type: "manual",
});

/** The fake value of a text, date or amount question with no proposal. */
function fakeValue(q: QuestionState, k: FramingKnowledge): unknown {
  switch (QUESTIONS[q.key].kind) {
    case "date":
      return k.project.dueDate ?? fakeTargetDate();
    case "money":
      return k.project.budgetCents ?? FAKE_BUDGET_CENTS;
    default:
      return FAKE_FRAMING_TEXTS[q.key] ?? FAKE_FRAMING_TEXT;
  }
}

async function fillQuestion(
  supabase: Supabase,
  organizationId: string,
  q: QuestionState,
  k: FramingKnowledge,
): Promise<boolean> {
  const projectId = k.project.id;
  const kind = QUESTIONS[q.key].kind;
  const brief = (row: BriefRow) =>
    supabase.from("field_values").insert({
      organization_id: organizationId,
      project_id: projectId,
      deliverable: "brief",
      field_key: q.key,
      ...row,
      value: row.value as never,
    });

  if (kind === "text" || kind === "date" || kind === "money") {
    const row =
      (q.status === "to_confirm" && confirmedRow(q, k)) ||
      manual(fakeValue(q, k));
    return logged(await brief(row), `framing ${q.key}`);
  }
  if (q.status === "to_confirm")
    return logged(
      await confirmLines(supabase, projectId, q.key),
      `framing ${q.key}`,
    );

  const line = { organization_id: organizationId, project_id: projectId };
  switch (kind) {
    case "needs":
      return logged(
        await supabase.from("needs").insert(
          FAKE_NEEDS.map((need) => ({
            ...line,
            label: fr.framing.needs.presets[need.preset],
            family: need.family,
          })),
        ),
        "framing needs",
      );
    case "deadlines":
      return logged(
        await supabase.from("framing_deadlines").insert({
          ...line,
          kind: "release",
          label: null,
          due_date: k.project.dueDate ?? fakeTargetDate(),
        }),
        "framing deadlines",
      );
    case "constraints":
      return logged(
        await supabase
          .from("framing_constraints")
          .insert({ ...line, ...FAKE_CONSTRAINT }),
        "framing constraints",
      );
    default:
      // Team and rights: « Rien à signaler ».
      return logged(await brief(manual({ none: true })), `framing ${q.key}`);
  }
}

export async function fillFraming(
  supabase: Supabase,
  access: Access,
  project: ProjectDetail,
): Promise<Step> {
  if (!(await openFraming(supabase, project))) return false;
  const knowledge = await loadFramingKnowledge(project.id, access);
  if (!knowledge) return false;
  const open = assessFraming(knowledge)
    .dimensions.flatMap((d) => d.questions)
    .filter((q) => q.status !== "known" && !q.dismissed);
  if (!open.length) return null;
  // In order: the target date is written before the deadlines that use it.
  for (const q of open)
    if (!(await fillQuestion(supabase, access.organizationId!, q, knowledge)))
      return false;
  return true;
}

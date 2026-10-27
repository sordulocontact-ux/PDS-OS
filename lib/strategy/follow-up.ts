// Follow-up of the Stratégie before the release (ticket Stratégie § 14): what
// PO watches, each item Prêt, En cours, En attente or Bloqué, with one short
// reason — all computed by code from the project's data (CLAUDE.md, rule 6).
// Client-safe, pure. Rules:
// - contents (one per committed deliverable): delivered → Prêt; its linked
//   milestone passed without delivery, or an upstream deadline passed while
//   its step is not done → Bloqué; a version or a final file waiting for a
//   decision → En attente; otherwise (to design, changes asked, in
//   production) → En cours;
// - influence, RP / médias, playlisting (one per selected lever whose label
//   names it): the worst state of its deliverables (Bloqué > En attente >
//   En cours > Prêt); without deliverable → En cours, with its next milestone
//   on the matching channel if any;
// - coordination: the project's tasks (one overdue → Bloqué, open → En
//   cours, all done → Prêt) and the upstream deadlines (one passed and not
//   done → Bloqué, some to come → En cours, all held → Prêt);
// - validations: each strategy document (approved → Prêt, sent → En
//   attente, changes asked or generated not sent or not generated → En
//   cours) and each stage validation pending → En attente.

import { formatBriefDate } from "@/lib/framing/assess";
import { strategyCalendar } from "@/lib/i18n/fr/strategy-calendar";
import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import {
  WATCHED,
  contentItem,
  lateSteps,
  worst,
  type FollowUpGroup,
  type FollowUpInput,
  type FollowUpItem,
} from "@/lib/strategy/follow-up-model";

const fr = { strategyCalendar, strategyFollowUp };

export {
  FOLLOW_UP_AREAS,
  FOLLOW_UP_STATES,
  lateSteps,
  stepDone,
  type FollowUpArea,
  type FollowUpGroup,
  type FollowUpInput,
  type FollowUpItem,
  type FollowUpState,
} from "@/lib/strategy/follow-up-model";

const r = fr.strategyFollowUp.reasons;
const steps = fr.strategyCalendar.upstream.steps;

/** Every watched item before the release, by area (empty areas left out). */
export function followUpGroups(input: FollowUpInput): FollowUpGroup[] {
  const late = lateSteps(input);
  const contents = input.deliverables.map((d) => contentItem(d, input, late));
  const byId = new Map(contents.map((c, i) => [input.deliverables[i].id, c]));
  const selected = input.levers.filter((l) => l.state === "selected");

  const leverGroups = WATCHED.map(({ area, pattern, channel }) => ({
    area,
    items: selected
      .filter((l) => pattern.test(l.label))
      .map((l): FollowUpItem => {
        const own = input.deliverables.filter((d) => d.lever_id === l.id);
        const states = own.map((d) => byId.get(d.id)!.state);
        if (own.length > 0)
          return {
            key: `lever-${l.id}`,
            label: l.label,
            state: worst(states),
            reason: r.leverDeliverables(
              states.filter((s) => s === "ready").length,
              own.length,
            ),
          };
        const next = input.milestones.find(
          (m) => m.channel === channel && m.occurs_on >= input.today,
        );
        return {
          key: `lever-${l.id}`,
          label: l.label,
          state: "in_progress",
          reason: next
            ? r.leverNext(next.title, formatBriefDate(next.occurs_on))
            : r.leverNothing,
        };
      }),
  }));

  return [
    { area: "contents" as const, items: contents },
    ...leverGroups,
    { area: "coordination" as const, items: coordination(input, late) },
    { area: "validations" as const, items: validations(input) },
  ].filter((g) => g.items.length > 0);
}

function coordination(
  input: FollowUpInput,
  late: ReturnType<typeof lateSteps>,
): FollowUpItem[] {
  const t = fr.strategyFollowUp.labels;
  const items: FollowUpItem[] = [];
  const open = input.tasks.filter((x) => x.status !== "done");
  const overdue = open.filter((x) => x.due_date && x.due_date < input.today);
  if (input.tasks.length > 0)
    items.push({
      key: "tasks",
      label: t.tasks,
      state: overdue.length ? "blocked" : open.length ? "in_progress" : "ready",
      reason: overdue.length
        ? r.tasksOverdue(overdue.length)
        : open.length
          ? r.tasksOpen(open.length)
          : r.tasksDone,
    });
  if (late.length > 0) {
    const passed = late.flatMap((l) => l.late);
    const next = late
      .flatMap((l) =>
        l.chain.steps
          .filter((s) => s.date >= input.today)
          .map((s) => ({ step: s, chain: l.chain })),
      )
      .sort((a, b) => a.step.date.localeCompare(b.step.date))[0];
    items.push({
      key: "upstream",
      label: t.upstream,
      state: passed.length ? "blocked" : next ? "in_progress" : "ready",
      reason: passed.length
        ? r.upstreamLateCount(passed.length)
        : next
          ? r.upstreamNext(
              steps[next.step.key],
              next.chain.deliverableTitle,
              formatBriefDate(next.step.date),
            )
          : r.upstreamDone,
    });
  }
  return items;
}

function validations(input: FollowUpInput): FollowUpItem[] {
  const docs = fr.strategyFollowUp.documents;
  const items = (["brief", "release_plan", "press_kit"] as const).map(
    (kind): FollowUpItem => {
      const versions = input.documents.filter((d) => d.kind === kind);
      const sent = versions.find((d) => d.state === "sent");
      const latest = versions.find((d) => d.state !== "superseded");
      const approved = versions.find((d) => d.state === "approved");
      const base = { key: `doc-${kind}`, label: docs[kind] };
      if (sent)
        return {
          ...base,
          state: "waiting",
          reason: r.docSent(sent.pendingReviews),
        };
      if (latest?.state === "changes_requested")
        return { ...base, state: "in_progress", reason: r.docChanges };
      if (latest?.state === "pending")
        return { ...base, state: "in_progress", reason: r.docPending };
      if (approved)
        return {
          ...base,
          state: "ready",
          reason: r.docApproved(approved.version),
        };
      return { ...base, state: "in_progress", reason: r.docMissing };
    },
  );
  const stages = fr.strategyFollowUp.stages;
  return [
    ...items,
    ...input.pendingStages.map((key) => ({
      key: `stage-${key}`,
      label: stages[key] ?? key,
      state: "waiting" as const,
      reason: r.stagePending,
    })),
  ];
}

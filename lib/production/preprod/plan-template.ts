// The preproduction plan proposed by code (PROD-006, PROD-010): the usual
// steps of a shoot, adapted to the director's brief, each with its due date
// read in the backward schedule (lib/production/preprod/schedule.ts), its
// dependencies and a proposed holder. A date already past is never set
// silently: the action is proposed without date, flagged. Pure,
// client-safe; the owner adjusts, then approves.

import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import type { ProductionBrief } from "@/lib/production/brief";

import type { ScheduleStep } from "./schedule";

const fr = { productionPreprod };

export const TEMPLATE_KEYS = [
  "director_brief",
  "technical_call",
  "location",
  "permits",
  "team",
  "live_sound",
  "quotes",
  "rental",
  "call_sheet",
  "readiness",
  "backup",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

type Template = {
  key: TemplateKey;
  // The schedule date it is due by.
  due: ScheduleStep;
  dependsOn: TemplateKey[];
  // « director » when the director is known, else the owner.
  holder: "owner" | "director";
  blocking: boolean;
  // Only when the brief says so.
  when?: (brief: ProductionBrief) => boolean;
};

const TEMPLATES: Template[] = [
  {
    key: "director_brief",
    due: "brief",
    dependsOn: [],
    holder: "director",
    blocking: true,
  },
  {
    key: "technical_call",
    due: "location",
    dependsOn: ["director_brief"],
    holder: "owner",
    blocking: false,
  },
  {
    key: "location",
    due: "location",
    dependsOn: ["director_brief"],
    holder: "owner",
    blocking: true,
  },
  {
    key: "permits",
    due: "rental",
    dependsOn: ["location"],
    holder: "owner",
    blocking: true,
  },
  {
    key: "team",
    due: "team",
    dependsOn: ["technical_call"],
    holder: "owner",
    blocking: true,
  },
  {
    key: "live_sound",
    due: "team",
    dependsOn: ["technical_call"],
    holder: "owner",
    blocking: false,
    when: (b) => b.soundCapture === "live" || b.soundCapture === "mixed",
  },
  {
    key: "quotes",
    due: "estimates",
    dependsOn: ["technical_call"],
    holder: "owner",
    blocking: false,
  },
  {
    key: "rental",
    due: "rental",
    dependsOn: ["quotes"],
    holder: "owner",
    blocking: true,
  },
  {
    key: "call_sheet",
    due: "call_sheet",
    dependsOn: ["location", "team", "rental"],
    holder: "owner",
    blocking: true,
  },
  {
    key: "readiness",
    due: "call_sheet",
    dependsOn: ["call_sheet", "permits"],
    holder: "owner",
    blocking: true,
  },
  {
    key: "backup",
    due: "backup",
    dependsOn: [],
    holder: "owner",
    blocking: true,
  },
];

export type ProposedAction = {
  key: TemplateKey;
  title: string;
  dueDate: string | null;
  // The schedule gave a date already past: proposed without it.
  pastDate: string | null;
  dependsOn: TemplateKey[];
  holder: "owner" | "director";
  blocking: boolean;
};

/** The actions to propose: the brief's, minus those already in the plan. */
export function proposePlan(input: {
  brief: ProductionBrief;
  due: Partial<Record<ScheduleStep, string>>;
  today: string;
  existing: Set<string>;
  hasDirector: boolean;
}): ProposedAction[] {
  const t = fr.productionPreprod.plan.template;
  return TEMPLATES.filter(
    (tpl) => !input.existing.has(tpl.key) && (tpl.when?.(input.brief) ?? true),
  ).map((tpl) => {
    const date = input.due[tpl.due] ?? null;
    const past = date !== null && date < input.today;
    return {
      key: tpl.key,
      title: t.titles[tpl.key],
      dueDate: past ? null : date,
      pastDate: past ? date : null,
      dependsOn: tpl.dependsOn,
      holder:
        tpl.holder === "director" && input.hasDirector ? "director" : "owner",
      blocking: tpl.blocking,
    };
  });
}

export type Reschedule = {
  actionId: string;
  title: string;
  from: string | null;
  to: string;
};

/** After a shoot or delivery date changed (PROD-010): the proposed actions
 * whose due date the schedule now moves, shown before anything changes.
 * Removed, done or past-dated targets are left alone. */
export function reschedulePlan(input: {
  actions: {
    id: string;
    title: string;
    templateKey: string | null;
    dueDate: string | null;
    status: string;
    taskDone: boolean | null;
  }[];
  due: Partial<Record<ScheduleStep, string>>;
  today: string;
}): Reschedule[] {
  return input.actions.flatMap((a) => {
    const tpl = TEMPLATES.find((x) => x.key === a.templateKey);
    if (!tpl || a.status === "removed" || a.taskDone) return [];
    const to = input.due[tpl.due];
    if (!to || to === a.dueDate || to < input.today) return [];
    return [{ actionId: a.id, title: a.title, from: a.dueDate, to }];
  });
}

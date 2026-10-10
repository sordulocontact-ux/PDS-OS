// What PO points out on a Fiche Livrable before it is submitted (ticket
// « Conception » § 10–11): facts computed by code, never by a model.
// - blockers: the sheet cannot be submitted as is;
// - warnings: to check or arbitrate, never blocking;
// - deferred: left to Production on purpose (place, people, equipment).
// Client-safe.

export type SheetCheckInput = {
  hasResponsible: boolean;
  validatorIds: string[];
  responsibleId: string | null;
  ratios: string[];
  durationMin: number | null;
  durationMax: number | null;
  subtitles: boolean | null;
  subtitleRatios: string[];
  subtitleMode: string | null;
  shootDate: string | null;
  postStart: string | null;
  postDeadline: string | null;
  deliveryDate: string | null;
  budgetCents: number | null;
  // From the Stratégie, when known: the deliverable's due date and the
  // first milestone it comes out on.
  strategyDue: string | null;
  milestoneDate: string | null;
  // A series: its items and their delivery dates.
  items: Array<{ number: number; deliveryDate: string | null }>;
};

export type BlockerKey =
  | "responsible"
  | "validators"
  | "ratios"
  | "duration"
  | "subtitles"
  | "subtitleDetails"
  | "subtitleRatios"
  | "deliveryDate"
  | "shootAfterPost"
  | "postOrder"
  | "postAfterDelivery"
  | "shootAfterDelivery"
  | "afterStrategyDue"
  | "afterMilestone"
  | "itemAfterMilestone";

export type WarningKey =
  "budgetMissing" | "selfValidation" | "itemWithoutDate" | "noShootDate";

export type DeferredKey = "place" | "musicians" | "crew" | "equipment";

export type SheetChecks = {
  blockers: BlockerKey[];
  warnings: WarningKey[];
  // Always the same reminders: never a reason to hold the sheet.
  deferred: DeferredKey[];
};

const DEFERRED: DeferredKey[] = ["place", "musicians", "crew", "equipment"];

// "YYYY-MM-DD" strings compare in calendar order.
const after = (a: string | null, b: string | null) =>
  a !== null && b !== null && a > b;

export function sheetChecks(input: SheetCheckInput): SheetChecks {
  const blockers: BlockerKey[] = [];
  const warnings: WarningKey[] = [];
  const add = (key: BlockerKey, when: boolean) => {
    if (when) blockers.push(key);
  };

  add("responsible", !input.hasResponsible);
  add("validators", input.validatorIds.length === 0);
  add("ratios", input.ratios.length === 0);
  add("duration", input.durationMin === null && input.durationMax === null);
  add("subtitles", input.subtitles === null);
  add(
    "subtitleDetails",
    input.subtitles === true &&
      (input.subtitleRatios.length === 0 || input.subtitleMode === null),
  );
  add(
    "subtitleRatios",
    input.subtitles === true &&
      input.subtitleRatios.some((r) => !input.ratios.includes(r)),
  );
  add("deliveryDate", input.deliveryDate === null);
  add("shootAfterPost", after(input.shootDate, input.postStart));
  add("postOrder", after(input.postStart, input.postDeadline));
  add("postAfterDelivery", after(input.postDeadline, input.deliveryDate));
  add("shootAfterDelivery", after(input.shootDate, input.deliveryDate));
  add("afterStrategyDue", after(input.deliveryDate, input.strategyDue));
  add("afterMilestone", after(input.deliveryDate, input.milestoneDate));
  add(
    "itemAfterMilestone",
    input.items.some((i) => after(i.deliveryDate, input.milestoneDate)),
  );

  if (input.budgetCents === null) warnings.push("budgetMissing");
  if (
    input.responsibleId !== null &&
    input.validatorIds.includes(input.responsibleId)
  )
    warnings.push("selfValidation");
  if (input.items.some((i) => i.deliveryDate === null))
    warnings.push("itemWithoutDate");
  if (input.shootDate === null) warnings.push("noShootDate");

  return { blockers, warnings, deferred: DEFERRED };
}

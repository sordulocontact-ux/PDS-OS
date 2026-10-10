// Préproduction › Rétroplanning (ticket, parcours 9): a simple backward
// schedule from the shoot date and the delivery date, computed by code
// (rule 6: PO never produces a date). Fixed offsets, in days:
//   from the shoot (J):   brief validated J-21 · location confirmed J-14 ·
//                         team confirmed J-10 · estimates J-10 ·
//                         equipment rented J-7 · call sheet J-2 · shoot J ·
//                         rushes backed up J+1;
//   postproduction:       its own dates when known, else from J+2 to the
//                         validation;
//   from the delivery (L): validation L-3 · exports L-1 · delivery L.
// A step whose evidence is known (location confirmed…) reads as done; a
// past step not done is late; dates that contradict each other are
// flagged, never corrected. Client-safe.

import { addDays, dayOffset } from "@/lib/strategy/calendar";

import type { EffectiveLogistics } from "@/lib/production/logistics";

export const SCHEDULE_STEPS = [
  "brief",
  "location",
  "team",
  "estimates",
  "rental",
  "call_sheet",
  "shoot",
  "backup",
  "post",
  "validation",
  "exports",
  "delivery",
] as const;
export type ScheduleStep = (typeof SCHEDULE_STEPS)[number];

// Days from the shoot date, or from the delivery date.
const FROM_SHOOT: Partial<Record<ScheduleStep, number>> = {
  brief: -21,
  location: -14,
  team: -10,
  estimates: -10,
  rental: -7,
  call_sheet: -2,
  shoot: 0,
  backup: 1,
};
const FROM_DELIVERY: Partial<Record<ScheduleStep, number>> = {
  validation: -3,
  exports: -1,
  delivery: 0,
};
// What each step waits for (shown, never enforced).
export const SCHEDULE_DEPENDS: Partial<Record<ScheduleStep, ScheduleStep[]>> = {
  location: ["brief"],
  team: ["brief"],
  estimates: ["brief"],
  rental: ["estimates"],
  call_sheet: ["location", "team", "rental"],
  shoot: ["call_sheet"],
  backup: ["shoot"],
  post: ["backup"],
  validation: ["post"],
  exports: ["validation"],
  delivery: ["exports"],
};

/** What the code already knows is done (null: not tracked here). */
export type ScheduleFacts = Partial<Record<ScheduleStep, boolean>>;

export type ScheduleRow = {
  step: ScheduleStep;
  date: string | null;
  // Postproduction spans a period.
  end: string | null;
  done: boolean | null;
  late: boolean;
  dependsOn: ScheduleStep[];
};

export type ScheduleWarning =
  | "no_shoot"
  | "no_delivery"
  | "delivery_before_shoot"
  | "post_after_delivery"
  | "post_before_shoot";

export function retroSchedule(
  logistics: EffectiveLogistics,
  facts: ScheduleFacts,
  today: string,
): { rows: ScheduleRow[]; warnings: ScheduleWarning[] } {
  const shoot = logistics.shootDate.value;
  const delivery = logistics.deliveryDate.value;
  const validation = delivery
    ? addDays(delivery, FROM_DELIVERY.validation!)
    : null;
  const postStart =
    logistics.postStart.value ?? (shoot ? addDays(shoot, 2) : null);
  const postEnd = logistics.postEnd.value ?? validation;

  const warnings: ScheduleWarning[] = [];
  if (!shoot) warnings.push("no_shoot");
  if (!delivery) warnings.push("no_delivery");
  if (shoot && delivery && dayOffset(delivery, shoot) < 0)
    warnings.push("delivery_before_shoot");
  if (postEnd && delivery && dayOffset(delivery, postEnd) < 0)
    warnings.push("post_after_delivery");
  if (postStart && shoot && dayOffset(postStart, shoot) < 0)
    warnings.push("post_before_shoot");

  const rows = SCHEDULE_STEPS.map((step): ScheduleRow => {
    const fromShoot = FROM_SHOOT[step];
    const fromDelivery = FROM_DELIVERY[step];
    const date =
      step === "post"
        ? postStart
        : fromShoot !== undefined
          ? shoot && addDays(shoot, fromShoot)
          : fromDelivery !== undefined && delivery
            ? addDays(delivery, fromDelivery)
            : null;
    const end = step === "post" ? postEnd : null;
    const done = facts[step] ?? null;
    const last = end ?? date;
    return {
      step,
      date,
      end,
      done,
      late: done === false && last !== null && dayOffset(last, today) < 0,
      dependsOn: SCHEDULE_DEPENDS[step] ?? [],
    };
  });
  return { rows, warnings };
}

/** Days left before the shoot (negative after), null without a date. */
export function daysToShoot(
  logistics: EffectiveLogistics,
  today: string,
): number | null {
  const shoot = logistics.shootDate.value;
  return shoot ? dayOffset(shoot, today) : null;
}

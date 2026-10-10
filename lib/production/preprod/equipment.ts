// Préproduction › Matériel (ticket, parcours 8, MVP): the manual list, from
// the need to the return. A line read from a quote stays « À vérifier »
// until a person verifies it; a quoted item is neither booked nor rented;
// only confirmed lines feed the return follow-up. Possible duplicates are
// pointed out for a merge the person confirms, never removed silently.
// Computed by code. Client-safe.

import { normalizeSearch } from "@/lib/utils/search";

import type { Equipment, EquipmentStatus } from "./types";

// Booked and after: what the return follow-up tracks.
export const CONFIRMED_EQUIPMENT: readonly EquipmentStatus[] = [
  "booked",
  "picked_up",
  "to_return",
  "returned",
  "incident",
];
export const isConfirmedEquipment = (e: Pick<Equipment, "status">) =>
  CONFIRMED_EQUIPMENT.includes(e.status);

// Statuses a person may choose in the form: « À vérifier » is only where a
// quote line starts (verifying moves it on), « Rendu » is written with its
// trace by the database.
export const EQUIPMENT_FORM_STATUSES: readonly EquipmentStatus[] = [
  "need",
  "quoted",
  "retained",
  "booked",
  "picked_up",
  "to_return",
  "returned",
  "incident",
];

/** Pairs of lines that look like the same item (same category, same
 * label once normalised). */
export function duplicatePairs(
  equipment: Equipment[],
): { keep: Equipment; other: Equipment }[] {
  const seen = new Map<string, Equipment>();
  const pairs: { keep: Equipment; other: Equipment }[] = [];
  for (const e of equipment) {
    const key = `${e.category}|${normalizeSearch(e.label)}`;
    const first = seen.get(key);
    if (first) pairs.push({ keep: first, other: e });
    else seen.set(key, e);
  }
  return pairs;
}

/** A confirmed line still out after its return date. */
export function isReturnLate(e: Equipment, today: string): boolean {
  return (
    isConfirmedEquipment(e) &&
    e.status !== "returned" &&
    e.returnDue !== null &&
    e.returnDue < today
  );
}

export type EquipmentCounts = {
  total: number;
  toVerify: number;
  confirmed: number;
  toReturn: number;
  lateReturns: number;
};

export function equipmentCounts(
  equipment: Equipment[],
  today: string,
): EquipmentCounts {
  return {
    total: equipment.length,
    toVerify: equipment.filter((e) => e.status === "to_verify").length,
    confirmed: equipment.filter(isConfirmedEquipment).length,
    toReturn: equipment.filter(
      (e) => isConfirmedEquipment(e) && e.status !== "returned",
    ).length,
    lateReturns: equipment.filter((e) => isReturnLate(e, today)).length,
  };
}

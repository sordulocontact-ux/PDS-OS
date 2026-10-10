// Préproduction: the team as the briefs, the call sheet and the readiness
// read it — from the needs and their assignments, never copied. A person
// who holds several functions is pointed out; their availability stays the
// one recorded per position, nothing is inferred. Client-safe.

import { roleName } from "@/lib/production/call-prep";
import type { NeedFamily } from "@/lib/production/roles";
import type {
  Holder,
  ProductionAssignment,
  ProductionNeed,
} from "@/lib/production/sheet";

export type TeamMember = {
  holder: Holder;
  family: NeedFamily;
  role: string;
  availability: ProductionAssignment["availability"];
};

/** Everyone assigned, position by position (the unavailable left out). */
export function teamMembers(needs: ProductionNeed[]): TeamMember[] {
  return needs.flatMap((need) =>
    need.assignments
      .filter((a) => a.availability !== "unavailable")
      .map((a) => ({
        holder: a.holder,
        family: need.family,
        role: roleName(need),
        availability: a.availability,
      })),
  );
}

/** People holding more than one function, with their functions. */
export function multiRolePeople(
  needs: ProductionNeed[],
): { name: string; roles: string[] }[] {
  const byHolder = new Map<string, { name: string; roles: string[] }>();
  for (const m of teamMembers(needs)) {
    const key = `${m.holder.kind}:${m.holder.id}`;
    const entry = byHolder.get(key) ?? { name: m.holder.name, roles: [] };
    entry.roles.push(m.role);
    byHolder.set(key, entry);
  }
  return [...byHolder.values()].filter((e) => e.roles.length > 1);
}

export type StaffingCounts = {
  positions: number;
  filled: number;
  toConfirm: number;
};

/** Places to hold, places held, availabilities still to confirm. */
export function staffingCounts(needs: ProductionNeed[]): StaffingCounts {
  let positions = 0;
  let filled = 0;
  let toConfirm = 0;
  for (const need of needs) {
    const holding = need.assignments.filter(
      (a) => a.availability !== "unavailable",
    );
    positions += need.headcount;
    filled += Math.min(holding.length, need.headcount);
    toConfirm += holding.filter((a) => a.availability === "to_confirm").length;
  }
  return { positions, filled, toConfirm };
}

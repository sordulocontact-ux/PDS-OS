import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers, type Member } from "@/lib/framing/related";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { createClient } from "@/lib/supabase/server";

/** Who holds a designation of the Conception, and since when. */
export type DesignHolder = { personId: string; name: string; since: string };

/** The people of one scope: the artistic direction, or one Fiche Livrable. */
export type ScopePeople = {
  responsible: DesignHolder | null;
  validators: Member[];
};

export type DesignPeople = {
  // Approved members of the organization (the only ones who can act).
  members: Member[];
  direction: ScopePeople;
  // Per sheet id.
  sheets: Record<string, ScopePeople>;
  // Suggested by code, never assigned: the project's creative team first,
  // then the organization's other creative people. A suggestion says
  // nothing about availability (ticket § 5).
  suggestions: Member[];
};

/** Responsibles, validators and suggestions, read with the user's session. */
export async function loadDesignPeople(
  projectId: string,
  organizationId: string,
  access: Access,
): Promise<DesignPeople> {
  const supabase = await createClient();
  const [members, assignmentsRes, validatorsRes, creatives, creativePeople] =
    await Promise.all([
      loadMembers(access),
      supabase
        .from("design_assignments")
        .select("scope, sheet_id, person_id, assigned_at")
        .eq("project_id", projectId)
        .is("ended_at", null),
      supabase
        .from("design_validators")
        .select("scope, sheet_id, person_id")
        .eq("project_id", projectId),
      listProjectCreatives(projectId),
      listCreativePeople(organizationId),
    ]);

  const nameOf = new Map(members.map((m) => [m.personId, m.name]));
  const member = (personId: string): Member => ({
    personId,
    name: nameOf.get(personId) ?? "",
  });
  const empty = (): ScopePeople => ({ responsible: null, validators: [] });
  const direction = empty();
  const sheets: Record<string, ScopePeople> = {};
  const scopeOf = (sheetId: string | null) =>
    sheetId ? (sheets[sheetId] ??= empty()) : direction;

  for (const a of assignmentsRes.data ?? [])
    scopeOf(a.scope === "sheet" ? a.sheet_id : null).responsible = {
      ...member(a.person_id),
      since: a.assigned_at,
    };
  for (const v of validatorsRes.data ?? [])
    scopeOf(v.scope === "sheet" ? v.sheet_id : null).validators.push(
      member(v.person_id),
    );

  const seen = new Set<string>();
  const suggestions = [...creatives, ...creativePeople].filter((p) => {
    if (seen.has(p.personId) || !p.name) return false;
    seen.add(p.personId);
    return true;
  });

  return { members, direction, sheets, suggestions };
}

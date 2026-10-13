import "server-only";

import type { Member } from "@/lib/framing/related";
import { todayInParis } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";

// Roles of a Conception beyond designations (MKT-C2-08): the delegations
// given on a scope, and whether the project's governance lets a person
// approve what they submitted. Read with the user's session (RLS).

export type DesignDelegation = {
  id: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  role: "responsible" | "validator";
  fromName: string;
  toId: string;
  toName: string;
  reason: string;
  startsOn: string;
  endsOn: string;
  active: boolean;
  revoked: boolean;
};

export type DesignRoles = {
  allowSelfApproval: boolean;
  delegations: DesignDelegation[];
};

export async function loadDesignRoles(
  projectId: string,
  members: Member[],
): Promise<DesignRoles> {
  const supabase = await createClient();
  const [ws, rows] = await Promise.all([
    supabase
      .from("design_workspaces")
      .select("allow_self_approval")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("design_delegations")
      .select(
        "id, scope, sheet_id, role, from_person_id, to_person_id, reason, starts_on, ends_on, revoked_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);
  const today = todayInParis();
  const name = (id: string) =>
    members.find((m) => m.personId === id)?.name ?? "—";
  return {
    allowSelfApproval: ws.data?.allow_self_approval ?? false,
    delegations: (rows.data ?? []).map((d) => ({
      id: d.id,
      scope: d.scope === "sheet" ? "sheet" : "direction",
      sheetId: d.sheet_id,
      role: d.role === "validator" ? "validator" : "responsible",
      fromName: name(d.from_person_id),
      toId: d.to_person_id,
      toName: name(d.to_person_id),
      reason: d.reason,
      startsOn: d.starts_on,
      endsOn: d.ends_on,
      revoked: d.revoked_at !== null,
      active:
        d.revoked_at === null && d.starts_on <= today && today <= d.ends_on,
    })),
  };
}

/** The person holds `role` on the scope through an active delegation. */
export function delegatedTo(
  roles: DesignRoles,
  personId: string | null,
  scope: "direction" | "sheet",
  sheetId: string | null,
  role: "responsible" | "validator",
): boolean {
  return roles.delegations.some(
    (d) =>
      d.active &&
      d.toId === personId &&
      d.scope === scope &&
      d.sheetId === sheetId &&
      d.role === role,
  );
}

import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import {
  ANOMALY_KINDS,
  ANOMALY_MODULES,
  ANOMALY_STATES,
  SEVERITIES,
  sortAnomalies,
  type Anomaly,
} from "@/lib/distribution/anomalies";
import { loadMembers } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: string): value is T =>
    (values as readonly string[]).includes(value);
const isKind = oneOf(ANOMALY_KINDS);
const isSeverity = oneOf(SEVERITIES);
const isState = oneOf(ANOMALY_STATES);
const isModule = oneOf(ANOMALY_MODULES);

/** A project's anomalies, read with the viewer's session. */
export const loadAnomalies = cache(async function loadAnomalies(
  projectId: string,
  access: Access,
): Promise<Anomaly[]> {
  const supabase = await createClient();
  const [rows, members] = await Promise.all([
    supabase
      .from("distribution_anomalies")
      .select(
        "id, version_number, kind, description, platform, severity, source_module, state, state_note, reported_by, reported_at, state_by, state_at",
      )
      .eq("project_id", projectId),
    loadMembers(access),
  ]);
  if (rows.error) console.error("distribution anomalies:", rows.error.message);
  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;
  return sortAnomalies(
    (rows.data ?? []).flatMap((row) =>
      isKind(row.kind) &&
      isSeverity(row.severity) &&
      isState(row.state) &&
      isModule(row.source_module)
        ? [
            {
              id: row.id,
              version: row.version_number,
              kind: row.kind,
              description: row.description,
              platform: row.platform,
              severity: row.severity,
              module: row.source_module,
              state: row.state,
              stateNote: row.state_note,
              reportedBy: nameOf(row.reported_by),
              reportedAt: row.reported_at,
              stateBy: nameOf(row.state_by),
              stateAt: row.state_at,
            },
          ]
        : [],
    ),
  );
});

/** How many of the six checks someone recorded (the rest: « non vérifié »). */
export async function countRecordedChecks(projectId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("distribution_checks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .neq("result", "unchecked");
  return count ?? 0;
}

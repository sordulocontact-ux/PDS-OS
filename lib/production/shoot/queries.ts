import "server-only";

import type { Member } from "@/lib/framing/related";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_IMPACTS,
  isReturnStatus,
  isShootState,
  RETURN_STATUSES,
  type Declaration,
  type ReturnLine,
  type ShootIncident,
  type ShootRecord,
} from "@/lib/production/shoot/rules";
import type { Holder, NetworkOption } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

export type ShootData = {
  shoot: ShootRecord;
  incidents: ShootIncident[];
  equipment: ReturnLine[];
  // Titles of the project's open tasks: a proposal already created is not
  // proposed again.
  openTaskTitles: string[];
};

/**
 * One sheet's shoot, incidents and confirmed equipment, read with the
 * user's session (RLS: whoever sees the project). Names come from the
 * members and contacts the sheet already loaded.
 */
export async function loadShootData({
  projectId,
  sheetId,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  members: Member[];
  contacts: NetworkOption[];
}): Promise<ShootData> {
  const supabase = await createClient();
  const [shootRes, incidentsRes, equipmentRes, tasksRes] = await Promise.all([
    supabase
      .from("production_shoots")
      .select("*")
      .eq("sheet_id", sheetId)
      .maybeSingle(),
    supabase
      .from("production_incidents")
      .select(
        "id, title, impact, person_id, contact_id, follow_up, blocks_closing, blocks_post, resolution, resolved_by, resolved_at, category, impacts",
      )
      .eq("sheet_id", sheetId)
      .order("created_at"),
    supabase
      .from("production_equipment")
      .select(
        "id, label, quantity, supplier_name, supplier_contact_id, status, return_person_id, return_contact_id, return_due, returned_by, returned_at, incident_note, return_issue",
      )
      // Owned items are never returned (PROD-022).
      .neq("source", "owned")
      .eq("sheet_id", sheetId)
      .in("status", [...RETURN_STATUSES])
      .order("position")
      .order("created_at"),
    supabase
      .from("tasks")
      .select("title")
      .eq("project_id", projectId)
      .neq("status", "done")
      .limit(1000),
  ]);

  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? "—")
      : null;
  const contactName = (id: string) =>
    contacts.find((c) => c.id === id)?.name ?? "—";
  const holderOf = (
    personId: string | null,
    contactId: string | null,
  ): Holder | null =>
    personId
      ? { kind: "person", id: personId, name: nameOf(personId) ?? "—" }
      : contactId
        ? { kind: "contact", id: contactId, name: contactName(contactId) }
        : null;

  const row = shootRes.data;
  const declaration = (
    done: boolean | undefined,
    by: string | null | undefined,
    at: string | null | undefined,
  ): Declaration => ({
    done: Boolean(done),
    byName: nameOf(by ?? null),
    at: at ?? null,
  });
  const shoot: ShootRecord = {
    saved: row !== null,
    state: row && isShootState(row.state) ? row.state : "planned",
    observations: row?.observations ?? null,
    missingSequences: row?.missing_sequences ?? null,
    deviations: row?.deviations ?? null,
    declarations: {
      video_rushes: declaration(
        row?.video_rushes,
        row?.video_rushes_by,
        row?.video_rushes_at,
      ),
      audio_sources: declaration(
        row?.audio_sources,
        row?.audio_sources_by,
        row?.audio_sources_at,
      ),
      backup_verified: declaration(
        row?.backup_verified,
        row?.backup_verified_by,
        row?.backup_verified_at,
      ),
    },
    filesLocation: row?.files_location ?? null,
    rushesHolder: holderOf(
      row?.rushes_person_id ?? null,
      row?.rushes_contact_id ?? null,
    ),
    backupHolder: holderOf(
      row?.backup_person_id ?? null,
      row?.backup_contact_id ?? null,
    ),
    backupLocation: row?.backup_location ?? null,
    otherMedia: declaration(
      row?.other_media,
      row?.other_media_by,
      row?.other_media_at,
    ),
    startedAt: row?.started_at ?? null,
    endedAt: row?.ended_at ?? null,
    reportNote: row?.report_note ?? null,
    reportValidatedBy: nameOf(row?.report_validated_by ?? null),
    reportValidatedAt: row?.report_validated_at ?? null,
  };

  const incidents: ShootIncident[] = (incidentsRes.data ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    impact: i.impact,
    holder: holderOf(i.person_id, i.contact_id),
    followUp: i.follow_up,
    blocksClosing: i.blocks_closing,
    blocksPost: i.blocks_post,
    resolution: i.resolution,
    resolvedBy: nameOf(i.resolved_by),
    resolvedAt: i.resolved_at,
    category: INCIDENT_CATEGORIES.find((c) => c === i.category) ?? "other",
    impacts: INCIDENT_IMPACTS.filter((x) => i.impacts.includes(x)),
  }));

  const equipment: ReturnLine[] = (equipmentRes.data ?? []).flatMap((e) =>
    isReturnStatus(e.status)
      ? [
          {
            id: e.id,
            label: e.label,
            quantity: e.quantity,
            supplier:
              e.supplier_name ??
              (e.supplier_contact_id
                ? contactName(e.supplier_contact_id)
                : null),
            status: e.status,
            holder: holderOf(e.return_person_id, e.return_contact_id),
            returnDue: e.return_due,
            returnedBy: nameOf(e.returned_by),
            returnedAt: e.returned_at,
            incidentNote: e.incident_note,
            returnIssue:
              e.return_issue === "missing" || e.return_issue === "damaged"
                ? e.return_issue
                : null,
          },
        ]
      : [],
  );

  return {
    shoot,
    incidents,
    equipment,
    openTaskTitles: (tasksRes.data ?? []).map((task) => task.title),
  };
}

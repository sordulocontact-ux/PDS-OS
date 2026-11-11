"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  PARTICIPATION_ROLES,
  PARTICIPATION_STATUSES,
} from "@/lib/projects/participation-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The two gestures on the artists of a collective's titles
// (docs/pds-mic-plan.md, lot 3). The database decides who may (the owner
// once launched, who creates projects before: add_title_participation,
// set_title_participation_status), writes the credits of a confirmation
// and keeps the history; these only check the shape of the input. The
// interlocutor (contact_id) is not set from here yet: no screen asks it.

const idSchema = z.uuid();
const roleSchema = z.enum(PARTICIPATION_ROLES);
const statusSchema = z.enum(PARTICIPATION_STATUSES);

type RpcError = { code?: string; message: string };

function participationError(where: string, error: RpcError): string {
  const t = fr.projectTitles.participations.errors;
  const titles = fr.projectTitles.errors;
  const message = error.message;
  if (error.code === "42501") return fr.auth.errors.forbidden;
  if (message.includes("not_collective")) return titles.notCollective;
  if (
    message.includes("title_not_found") ||
    message.includes("project_not_found")
  )
    return titles.notFound;
  if (message.includes("participation_not_found")) return t.notFound;
  if (message.includes("title_abandoned")) return titles.abandoned;
  if (message.includes("participation_exists")) return t.exists;
  if (message.includes("main_artist_not_participant")) return t.mainArtist;
  if (message.includes("artist_not_found")) return t.artistNotFound;
  if (message.includes("contact_not_found")) return t.contactNotFound;
  if (message.includes("status_unchanged")) return t.unchanged;
  if (message.includes("note_too_long")) return t.noteTooLong;
  console.error(`${where}:`, message);
  return t.failed;
}

// The overview lists them, the Activité tells their history, an artist's
// page lists its collective projects, a credited title's page its credits.
function refresh(projectId: string, credited: boolean) {
  revalidatePath(routes.project(projectId), "layout");
  revalidatePath(routes.artists, "layout");
  if (credited) revalidatePath(routes.masters, "layout");
}

/** The toast of a gesture that credited the title in the Catalogue. */
function creditedDone(lead: string, count: number) {
  return count > 0
    ? fr.projectTitles.participations.credited(lead, count)
    : undefined;
}

/** « Ajouter un artiste » to a title: featured and proposed by default. */
export async function addTitleParticipation(input: {
  projectId: string;
  titleId: string;
  artistId: string;
  role: string;
  status: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.participations;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const titleId = idSchema.safeParse(input.titleId);
  const role = roleSchema.safeParse(input.role);
  const status = statusSchema.safeParse(input.status);
  if (
    !projectId.success ||
    !titleId.success ||
    !role.success ||
    !status.success
  )
    return { ok: false, error: t.errors.failed };
  const artistId = idSchema.safeParse(input.artistId);
  if (!artistId.success) return { ok: false, error: t.add.artistRequired };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_title_participation", {
    p_title_id: titleId.data,
    p_artist_id: artistId.data,
    p_role: role.data,
    p_status: status.data,
  });
  if (error)
    return {
      ok: false,
      error: participationError("addTitleParticipation", error),
    };
  const credited = data?.[0]?.credited ?? 0;
  refresh(projectId.data, credited > 0);
  return { ok: true, done: creditedDone(t.addedLead, credited) };
}

/** « Changer le statut » of a participation: declined or withdrawn, it
 * stays; confirmed, the title is credited. */
export async function setTitleParticipationStatus(input: {
  projectId: string;
  participationId: string;
  status: string;
}): Promise<WriteResult> {
  const t = fr.projectTitles.participations;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  const participationId = idSchema.safeParse(input.participationId);
  const status = statusSchema.safeParse(input.status);
  if (!projectId.success || !participationId.success || !status.success)
    return { ok: false, error: t.errors.failed };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_title_participation_status", {
    p_participation_id: participationId.data,
    p_status: status.data,
  });
  if (error)
    return {
      ok: false,
      error: participationError("setTitleParticipationStatus", error),
    };
  const credited = data ?? 0;
  refresh(projectId.data, credited > 0);
  return {
    ok: true,
    done:
      creditedDone(t.confirmedLead, credited) ??
      t.status.changed(t.statuses[status.data]),
  };
}

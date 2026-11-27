"use server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getStudioSession } from "@/lib/sessions/queries";
import type { StudioSession } from "@/lib/sessions/types";

// A studio session's side sheet (SessionSheet), read when it opens: the
// whole session (participants, links, notes, report) with the viewer's
// session (RLS), and whether the viewer may write it (its gestures).

export type SessionSheetData = {
  session: StudioSession;
  canEdit: boolean;
  viewerPersonId: string | null;
};

/** null: the session is gone or out of reach. */
export async function loadSessionSheet(
  sessionId: string,
): Promise<SessionSheetData | null> {
  const access = await requireApproved();
  const session = await getStudioSession(sessionId);
  if (!session) return null;
  return {
    session,
    canEdit: can(access, "manage_sessions"),
    viewerPersonId: access.personId,
  };
}

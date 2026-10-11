import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import { PROOF_BUCKET } from "@/lib/distribution/proof-rules";
import {
  isDeclarationKind,
  type Declaration,
} from "@/lib/distribution/tracking";
import { loadMembers } from "@/lib/framing/related";
import { canEditProject } from "@/lib/projects/edit-access";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// A proof opens for an hour after the page is read.
const SIGNED_SECONDS = 3600;

export type TrackingView = {
  // The approved version a deposit is about; null before any validation.
  current: number | null;
  declarations: Declaration[];
  canEdit: boolean;
  organizationId: string | null;
};

/** The deposit cycles of a project, read with the viewer's session; once
 * per request (the Suivi and the Plateformes both read it). */
export const loadTrackingView = cache(async function loadTrackingView(
  project: ProjectDetail,
  access: Access,
): Promise<TrackingView> {
  const supabase = await createClient();
  const [rows, current, members] = await Promise.all([
    supabase
      .from("distribution_declarations")
      .select(
        "id, version_number, kind, declared_on, orchard_id, note, proof_path, proof_name, proof_url, declared_by, declared_at, withdrawn_at, withdrawn_by, withdraw_note",
      )
      .eq("project_id", project.id)
      .order("declared_at", { ascending: false }),
    supabase.rpc("distribution_current_version", { p_project_id: project.id }),
    loadMembers(access),
  ]);
  if (rows.error)
    console.error("distribution declarations:", rows.error.message);
  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;

  const paths = (rows.data ?? []).flatMap((row) =>
    row.proof_path ? [row.proof_path] : [],
  );
  const signed = paths.length
    ? await supabase.storage
        .from(PROOF_BUCKET)
        .createSignedUrls(paths, SIGNED_SECONDS)
    : null;
  const hrefOf = (path: string) =>
    signed?.data?.find((item) => item.path === path)?.signedUrl ?? null;

  const declarations: Declaration[] = (rows.data ?? []).flatMap((row) =>
    isDeclarationKind(row.kind)
      ? [
          {
            id: row.id,
            version: row.version_number,
            kind: row.kind,
            declaredOn: row.declared_on,
            orchardId: row.orchard_id,
            note: row.note,
            proof:
              row.proof_path && row.proof_name
                ? { name: row.proof_name, href: hrefOf(row.proof_path) }
                : null,
            proofUrl: row.proof_url,
            declaredBy: nameOf(row.declared_by),
            declaredAt: row.declared_at,
            withdrawn: row.withdrawn_at
              ? {
                  at: row.withdrawn_at,
                  by: nameOf(row.withdrawn_by),
                  note: row.withdraw_note,
                }
              : null,
          },
        ]
      : [],
  );
  return {
    current: typeof current.data === "number" ? current.data : null,
    declarations,
    canEdit: canEditProject(access, project),
    organizationId: access.organizationId,
  };
});

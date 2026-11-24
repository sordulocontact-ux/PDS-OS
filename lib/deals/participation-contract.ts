import "server-only";

import type { Access } from "@/lib/auth/access";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import type { Deal } from "@/lib/deals/types";
import type { ParticipationStep } from "@/lib/deals/participation-types";
import { ficheOfDemarche } from "@/lib/legal/contracts/fix";
import { loadAgreements } from "@/lib/legal/contracts/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";

// The participation's contract of a deal in contracting, read from the
// Juridique of its project (loadAgreements: the same rows, the same
// state), with the viewer's session.

export async function loadParticipationStep(
  deal: Pick<Deal, "participationId" | "projectId">,
  access: Access,
): Promise<ParticipationStep | null> {
  if (!deal.participationId || !deal.projectId) return null;
  const supabase = await createClient();
  const [project, { data: participation }] = await Promise.all([
    getProject(deal.projectId),
    supabase
      .from("title_participations")
      .select("contact_id, artist_id")
      .eq("id", deal.participationId)
      .maybeSingle(),
  ]);
  if (!project || !participation) return null;
  // The person: the participation's contact, else the artist's own one in
  // the Réseau.
  const { data: artistContacts } = participation.artist_id
    ? await supabase
        .from("network_contacts")
        .select("id, name")
        .eq("artist_id", participation.artist_id)
        .is("archived_at", null)
    : { data: [] };
  const contactIds = [
    participation.contact_id,
    ...(artistContacts ?? []).map((c) => c.id),
  ].filter((id): id is string => Boolean(id));
  const agreements = await loadAgreements(project, access).catch(() => null);
  const row =
    agreements?.rows.find(
      (r) => r.contactId !== null && contactIds.includes(r.contactId),
    ) ?? null;
  const template =
    row?.template?.name ??
    row?.compatible.find((t) => t.id === row.proposal.templateId)?.label ??
    null;

  return {
    projectId: project.id,
    projectTitle: project.title,
    ownerName: project.ownerName,
    person: row?.name ?? artistContacts?.[0]?.name ?? "",
    key: row?.key ?? null,
    needId: row?.needId ?? null,
    state: row?.state ?? null,
    template,
    feeCents: row?.proposal.feeCents ?? null,
    missing: (row?.fields ?? [])
      .filter((f) => f.status === "missing" && f.home === "fiche")
      .map((f) => f.label),
    awaiting: row?.awaitingAgreement ?? null,
    noAgreementReason: row?.noAgreementReason ?? null,
    canAct: can(access, "manage_legal") && canEditProject(access, project),
    hrefs: {
      demarche: row ? legalDemarcheHref(project.id, "person", row.key) : null,
      fiche: row ? ficheOfDemarche(project.id, row.key) : null,
      plan: routes.projectLegalStep(project.id, "plan"),
    },
  };
}

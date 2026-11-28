import { notFound, redirect } from "next/navigation";

import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { AttachTitlePanel } from "@/components/legal/steps/attach-title-panel";
import { routes } from "@/lib/auth/redirects";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { scopeEntry } from "@/lib/legal/title-groups";
import { legalTitleLayout } from "@/lib/legal/title-layout";
import { canEditProject } from "@/lib/projects/edit-access";
import { titleBoardChoices } from "@/lib/projects/title-board";
import { legalAttachKey } from "@/lib/ui/legal-steps";

const fr = { legalDemarches };

/**
 * « Rattacher au Catalogue », the first step of a collective's
 * title not in the Catalogue yet (§ 3.6 of Ibé's 18/11): the project's
 * owner attaches it here (who writes the titles, the database deciding
 * again); anyone else reads who does. Once it has a master, the address
 * opens the title's first démarche, else the Juridique's entry; an address
 * of no title of the project answers 404.
 */
export async function AttachTitleStep({
  projectId,
  titleId,
}: {
  projectId: string;
  titleId: string;
}) {
  const [ctx, layout] = await Promise.all([
    legalJourneyContext(projectId),
    legalTitleLayout(projectId),
  ]);
  if (!layout || !layout.titleIds.includes(titleId)) notFound();
  const key = legalAttachKey(titleId);
  const scope = layout.scopes.find((s) => s.titleId === titleId);
  if (!scope?.steps.some((s) => s.key === key)) {
    const first = scope && scopeEntry(scope);
    redirect(first?.href ?? routes.projectLegal(projectId));
  }
  const canManage = canEditProject(ctx.access, ctx.project);
  const { masterOptions } = await titleBoardChoices(
    ctx.project,
    ctx.project.masters.map((m) => ({ master: { id: m.id } })),
    canManage,
  );
  return (
    <LegalStepFrame projectId={projectId} stepKey={key} titre={titleId}>
      {canManage && ctx.access.organizationId ? (
        <AttachTitlePanel
          projectId={projectId}
          titleId={titleId}
          organizationId={ctx.access.organizationId}
          masterOptions={masterOptions}
        />
      ) : (
        <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {fr.legalDemarches.attach.onlyOwner(ctx.project.ownerName ?? "—")}
        </p>
      )}
    </LegalStepFrame>
  );
}

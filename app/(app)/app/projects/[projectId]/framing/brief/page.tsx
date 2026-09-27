import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BriefActions } from "@/components/framing/guide/brief-actions";
import { BriefFacts } from "@/components/framing/guide/brief-facts";
import { RequestValidationButton } from "@/components/framing/request-validation-button";
import { buttonVariants } from "@/components/ui/button";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { briefFileName } from "@/lib/framing/brief-pdf";
import { briefFacts, briefObjective } from "@/lib/framing/brief-summary";
import { isFramingOpen, loadFraming } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * The Brief as one read-only page: what the recap says, in full, to share
 * with the team (members who see the project) or export as a PDF.
 */
export default async function FramingBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/framing/brief">) {
  const { projectId } = await params;
  const [access, project, framingOpen] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isFramingOpen(projectId),
  ]);
  if (!framingOpen) redirect(routes.projectFraming(projectId));
  const data = await loadFraming(projectId, access);
  if (!data) notFound();

  const t = fr.framingGuide;
  const canRequest =
    canEditProject(access, project) &&
    data.stage?.state === "in_progress" &&
    !data.pendingValidation;

  return (
    <div className="flex flex-col gap-4">
      <article className="flex flex-col gap-8 rounded-3xl border border-border bg-background p-5 md:p-10">
        <p className="text-caption font-semibold text-foreground">
          {`${t.brief.eyebrow} · ${project.title}`}
        </p>
        <header className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">
            {t.brief.objective}
          </p>
          <h2 className="text-display-md font-semibold break-words">
            {briefObjective(data) ?? t.summary.noObjective}
          </h2>
        </header>
        <BriefFacts facts={briefFacts(data)} />
      </article>

      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={routes.projectFramingStep(projectId, "summary")}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          {t.brief.back}
        </Link>
        {canRequest && data.stage && (
          <RequestValidationButton
            projectId={projectId}
            stageId={data.stage.id}
            size="lg"
          />
        )}
        <BriefActions
          pdfHref={routes.projectFramingBriefPdf(projectId)}
          fileName={briefFileName(project.title)}
        />
      </div>
    </div>
  );
}

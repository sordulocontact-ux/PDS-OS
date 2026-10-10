import { notFound } from "next/navigation";

import {
  DesignNeedsStrategy,
  EarlyDepositLink,
} from "@/components/design/design-needs-strategy";
import { DesignProgress } from "@/components/design/design-progress";
import {
  DeliverableHeading,
  DesignTrack,
} from "@/components/design/design-track";
import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { loadDesign } from "@/lib/design/queries";
import { fr } from "@/lib/i18n/fr";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.design;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Conception stage: the Dossier de conception on one page — the creative
 * direction, then each deliverable committed by the Strategy, version after
 * version until one is approved.
 */
export default async function DesignPage({
  params,
}: PageProps<"/app/projects/[projectId]/design">) {
  const { projectId } = await params;
  const [access, project, creatives] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    listProjectCreatives(projectId),
  ]);
  const creative =
    !canEditProject(access, project) &&
    creatives.some((c) => c.personId === access.personId);
  // The Conception designs what the validated Strategy committed to.
  if (!isStageValidated(project.stages, "launch_strategy")) {
    return (
      <DesignNeedsStrategy
        projectId={projectId}
        canEdit={canEditProject(access, project)}
        creative={creative}
      />
    );
  }
  const data = await loadDesign(projectId, access);
  if (!data) notFound();

  const state = data.stage?.state ?? "not_started";
  const inProgress = state === "in_progress";
  // The owner writes the Dossier's text only while in progress; the database
  // enforces it (design_is_editable). Deposits follow their own rule.
  const canWrite = canEditProject(access, project) && inProgress;
  const status =
    state === "not_started" ? t.notStarted : inProgress ? null : t.locked;
  const track = {
    organizationId: data.organizationId,
    projectId,
    canReview: data.canReview,
    mePersonId: data.mePersonId,
    inProgress,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
          {creative && state === "not_started" && (
            <div className="grid justify-items-start gap-2 pt-1">
              <p className="text-sm text-muted-foreground">{t.earlyDeposit}</p>
              <EarlyDepositLink projectId={projectId} size="sm" />
            </div>
          )}
        </CardHeader>
        <CardContent className="grid divide-y divide-border">
          <section className="grid gap-1 pb-4">
            <h3 className="text-sm font-medium">{t.direction.title}</h3>
            <p className="text-xs text-muted-foreground">{t.direction.hint}</p>
            <EditAccessProvider canEdit={canWrite}>
              {data.fields.map((field) => (
                <BriefFieldCard
                  key={`${field.key}-${field.value ?? ""}`}
                  field={field}
                  label={t.fields[field.key]}
                  projectId={projectId}
                />
              ))}
            </EditAccessProvider>
            <div className="grid gap-3 pt-2">
              <h4 className="text-sm font-medium">{t.direction.boards}</h4>
              <DesignTrack
                {...track}
                track={data.direction}
                depositTarget={t.deposit.directionTarget}
                emptyLabel={t.direction.boardsEmpty}
              />
            </div>
          </section>

          <section className="grid gap-3 pt-4">
            <div className="grid gap-1">
              <h3 className="text-sm font-medium">{t.deliverables.title}</h3>
              <p className="text-xs text-muted-foreground">
                {t.deliverables.hint}
              </p>
            </div>
            {data.deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.deliverables.empty}
              </p>
            ) : (
              <ul className="grid gap-3">
                {data.deliverables.map((d) => (
                  <li
                    key={d.deliverableId}
                    id={`deliverable-${d.deliverableId}`}
                    className="scroll-mt-24"
                  >
                    <DesignTrack
                      {...track}
                      track={d}
                      heading={<DeliverableHeading track={d} />}
                      depositTarget={d.title}
                      emptyLabel={t.version.none}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <aside className="grid content-start gap-6">
        <Card>
          <CardContent>
            <ValidationPanel
              stage={data.stage}
              pendingValidation={data.pendingValidation}
              projectId={projectId}
              mePersonId={access.personId}
              title={t.validation.title}
              startLabel={t.validation.start}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <DesignProgress counts={data.counts} projectId={projectId} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

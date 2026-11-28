import { RequestFilesButton } from "@/components/master-workflow/file-requests/request-files-button";
import { masterFacts } from "@/components/master-workflow/master-step-frame";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { ProjectHeader } from "@/components/projects/project-header";
import {
  ModuleScopesList,
  type ModuleScopeRow,
} from "@/components/projects/tracks/module-scopes-list";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { buttonVariants } from "@/components/ui/button";
import { MineBadge } from "@/components/ui/mine-badge";
import { ViewLink } from "@/components/ui/view-link";
import { can } from "@/lib/auth/access";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { loadFileRequestRecipients } from "@/lib/master-workflow/file-requests";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { masterRoles } from "@/lib/master-workflow/roles";
import { loadMasterTitleScope } from "@/lib/master-workflow/title-scope";
import { joinArtistNames } from "@/lib/projects/participation-rules";
import {
  loadTitlesProgress,
  type TitleProgress,
} from "@/lib/projects/title-journeys";
import { canEditProject } from "@/lib/projects/edit-access";
import { masterNameOf } from "@/lib/projects/title-rules";
import { withTitre } from "@/lib/legal/title-groups";
import type { WorkflowCard } from "@/lib/overview/cards";
import { legalAttachHref } from "@/lib/ui/legal-steps";
import { masterStepHref } from "@/lib/ui/master-steps";

const fr = { legalDemarches, masterJourney };

/**
 * The entry of a collective's Master (Sacha, 28/11/2026, proto « Entrée du
 * Master »: never a title chosen by the code): its live titles, each with
 * the step it is at and « À vous » when the next action is the viewer's;
 * a name opens that title's journey on the step that waits for the viewer.
 * In the head, what the titles share: the Brief (one for the project,
 * décision 4), « Demander des fichiers » for the titles waiting for their
 * source (lot 9 bis, the project's owner) and « Qui fait quoi ». A title
 * not in the Catalogue yet has no step of the Master: its row says the
 * gesture that brings it in, « Rattacher au Catalogue » (the Juridique's
 * step of the title, the project's owner's: « À vous »), and opens it for
 * who may open the Juridique (Sacha, 28/11/2026: « Son attendu » said
 * nothing to do and led nowhere).
 */
export async function MasterTitlesPage({ projectId }: { projectId: string }) {
  const [ctx, rows, scope] = await Promise.all([
    masterJourneyContext(projectId),
    loadTitlesProgress(projectId),
    loadMasterTitleScope(projectId, "source", null),
  ]);
  const { steps, facts, project, access } = ctx;
  const owner =
    project.ownerPersonId !== null && project.ownerPersonId === access.personId;
  const waitingSource = (scope?.choices ?? []).filter(
    (c) => c.waiting?.kind === "source",
  );
  const recipients =
    owner && waitingSource.length > 0
      ? await loadFileRequestRecipients(projectId)
      : [];
  const brief = steps.find((s) => s.key === "brief");
  const roles = masterRoles(facts, project.ownerName);
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        title={fr.masterJourney.module}
        facts={masterFacts(projectId)}
        actions={
          <>
            {brief && (
              <ViewLink
                href={masterStepHref(projectId, "brief")}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {brief.title}
                <MineBadge count={brief.actor?.viewer ? 1 : 0} />
              </ViewLink>
            )}
            {owner && waitingSource.length > 0 && (
              <RequestFilesButton
                projectId={projectId}
                titles={waitingSource.map((c) => ({
                  titleId: c.titleId,
                  label: c.label,
                  askedOf: c.request?.name ?? null,
                }))}
                recipients={recipients}
              />
            )}
            <WhoDoesWhatButton
              {...roles}
              personLinks={
                <ContactLinksSection
                  projectId={projectId}
                  sub={(roles.links?.length ?? 0) > 0}
                />
              }
            />
          </>
        }
      />
      <ModuleScopesList
        rows={rows
          .filter((row) => !row.abandoned)
          .map((row) =>
            rowOf(row, {
              projectId,
              legal: can(access, "manage_legal"),
              owner: canEditProject(access, project),
              total: steps.length,
            }),
          )}
      />
    </div>
  );
}

function rowOf(
  row: TitleProgress,
  ctx: { projectId: string; legal: boolean; owner: boolean; total: number },
): ModuleScopeRow {
  const card = row.cards.find((c) => c.workflow === "master");
  // An unnamed title's label already names its guests.
  const named = row.title.workingTitle ?? masterNameOf(row.title.master);
  const open =
    row.title.master && card && !card.restricted ? card : attachCard(row, ctx);
  return {
    key: row.title.id,
    label: row.label,
    subtitle:
      named && row.guests.length > 0 ? joinArtistNames(row.guests) : null,
    href: open.restricted ? null : open.href || null,
    card: open,
  };
}

/** A title not in the Catalogue yet, read as its Master's first gesture:
 * « Rattacher au Catalogue », none of the Master's steps done; its link
 * only for who may open the Juridique, where the step is. */
function attachCard(
  row: TitleProgress,
  ctx: { projectId: string; legal: boolean; owner: boolean; total: number },
): WorkflowCard {
  const todo = fr.legalDemarches.attach.title;
  return {
    workflow: "master",
    restricted: false,
    status: "not_started",
    href: ctx.legal
      ? withTitre(legalAttachHref(ctx.projectId, row.title.id), row.title.id)
      : "",
    index: 0,
    total: ctx.total,
    stepTitle: todo,
    done: 0,
    next: ctx.owner ? { mine: true, who: "", todo } : null,
  };
}

import Link from "next/link";

import { DocumentCard } from "@/components/strategy/documents/document-card";
import { StrategyTabs } from "@/components/strategy/strategy-tabs";
import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { loadStrategyPage } from "@/lib/strategy/page-data";
import { upstreamChains } from "@/lib/strategy/upstream";
import { approvedOf, versionsOf } from "@/lib/strategy/workspace";

/**
 * The Strategy's documents (ticket § 10 and § 13): Brief de sortie (internal),
 * Plan de sortie (artist's team), Dossier de presse (media), each with its
 * state and Voir · Partager · PDF · Versions; once the Brief is validated,
 * what the strategy sets off in Conception, Activations and Planning.
 */
export default async function StrategyDocumentsPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/documents">) {
  const { projectId } = await params;
  const { project, data, ctx, canEdit } = await loadStrategyPage(projectId);
  const t = fr.strategyDocs;
  const docs = ctx.documents;
  const brief = approvedOf(docs, "brief");
  const briefSent = docs.some((d) => d.kind === "brief" && d.state === "sent");
  const externalLock = !brief
    ? t.generator.needsBrief
    : briefSent
      ? t.generator.pending
      : null;
  const allDone =
    brief && approvedOf(docs, "release_plan") && approvedOf(docs, "press_kit");

  // Consequences (§ 10), counted by code from the strategy as it stands.
  const selectedLevers = data.levers.filter(
    (l) => l.state === "selected" && l.review_status === "confirmed",
  ).length;
  const chains = upstreamChains(
    data.deliverables,
    data.milestones,
    todayInParis(),
  );
  const deadlines =
    data.milestones.length +
    chains.reduce(
      (n, c) => n + c.steps.filter((s) => s.step !== "publication").length,
      0,
    );
  const consequences = [
    {
      key: "design",
      count: data.deliverables.length,
      href: routes.projectDesign(projectId),
    },
    {
      key: "activations",
      count: selectedLevers,
      href: routes.projectActivations(projectId),
    },
    {
      key: "planning",
      count: deadlines,
      href: routes.projectPlanning(projectId),
    },
  ] as const;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <StrategyTabs projectId={projectId} />

      {brief && (
        <ToneCallout tone="success">
          <span className="font-semibold">
            {allDone ? t.validated.allDone : t.validated.title}
          </span>{" "}
          · {t.validated.body}
        </ToneCallout>
      )}

      <ul className="grid gap-4 lg:grid-cols-3">
        <DocumentCard
          projectId={projectId}
          projectTitle={project.title}
          kind="brief"
          versions={versionsOf(docs, "brief")}
          generatorHref={routes.projectStrategyBrief(projectId)}
          generatorLabel={t.actions.open}
          lockedReason={null}
          canShare
        />
        <DocumentCard
          projectId={projectId}
          projectTitle={project.title}
          kind="release_plan"
          versions={versionsOf(docs, "release_plan")}
          generatorHref={
            canEdit ? routes.projectStrategyReleasePlan(projectId) : null
          }
          generatorLabel={t.actions.open}
          lockedReason={externalLock}
          canShare={canEdit}
        />
        <DocumentCard
          projectId={projectId}
          projectTitle={project.title}
          kind="press_kit"
          versions={versionsOf(docs, "press_kit")}
          generatorHref={
            canEdit ? routes.projectStrategyPressKit(projectId) : null
          }
          generatorLabel={t.actions.open}
          lockedReason={externalLock}
          canShare={canEdit}
        />
      </ul>

      {brief && (
        <section
          aria-labelledby="consequences-title"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="consequences-title" className="text-body-lg font-semibold">
              {t.validated.consequencesTitle}
            </h2>
            <p className="text-caption text-muted-foreground">
              {t.validated.noObligation}
            </p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {consequences.map((c) => {
              const copy = t.validated.consequences[c.key];
              return (
                <li
                  key={c.key}
                  className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-tint)] p-5"
                >
                  <h3 className="text-body-md font-semibold">{copy.title}</h3>
                  <p className="text-body-md text-muted-foreground">
                    {copy.body(c.count)}
                  </p>
                  <Link
                    href={c.href}
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                      className: "self-start",
                    })}
                  >
                    {copy.link}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

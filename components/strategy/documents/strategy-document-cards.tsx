import { DocumentActions } from "@/components/strategy/documents/document-actions";
import { ShareButton } from "@/components/strategy/release-plan/share-button";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  approvedOf,
  latestOf,
  type DocumentKind,
} from "@/lib/strategy/documents/model";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

/**
 * The strategy's three documents (ticket § 10 and § 13): the Brief de sortie
 * (internal), the Plan de sortie (the artist's team) and the Dossier de
 * presse (the media, optional). Each says who it is for and what it is
 * for (MKT-C2-01), and shows its reference version — the approved one,
 * else the latest — with its real state, and Voir · Partager · PDF ·
 * Versions; an external one is shared by its public link, the Brief only
 * inside the app. States come from strategy_documents, never decided here.
 */
export function StrategyDocumentCards({
  projectId,
  documents,
  canShare,
}: {
  projectId: string;
  documents: StrategyDocument[];
  // The project's owner: only they create a public link.
  canShare: boolean;
}) {
  const t = fr.strategyDocuments;
  const f = fr.strategyPressKit.finalised;
  const generator = (kind: "release_plan" | "press_kit", step?: number) =>
    kind === "press_kit"
      ? routes.projectStrategyPressKit(projectId, step)
      : routes.projectStrategyReleasePlan(projectId, step);

  const card = (kind: DocumentKind) => {
    const approved = approvedOf(documents, kind);
    const latest = latestOf(documents, kind);
    const ref = approved ?? latest;
    const newer =
      approved && latest && latest.version > approved.version ? latest : null;
    const label = ref
      ? ref.state === "approved"
        ? `✓ ${t.states.approved}`
        : ref.state === "pending" && kind !== "brief"
          ? f.generated
          : t.states[ref.state]
      : t.toGenerate;
    const actions =
      ref &&
      (kind === "brief" ? (
        <DocumentActions
          viewHref={routes.projectStrategyBriefVersion(projectId, ref.version)}
          shareHref={routes.projectStrategyBriefVersion(projectId, ref.version)}
          pdfHref={routes.projectStrategyDocumentPdf(projectId, ref.id)}
          versionsHref={`${routes.projectStrategyBrief(projectId)}#versions`}
        />
      ) : (
        <DocumentActions
          viewHref={`${generator(kind, 8)}&v=${ref.version}`}
          share={
            canShare && (
              <ShareButton projectId={projectId} documentId={ref.id} />
            )
          }
          pdfHref={routes.projectStrategyDocumentPdf(projectId, ref.id)}
          versionsHref={`${generator(kind, 8)}&v=${ref.version}#versions`}
        />
      ));
    return (
      <li
        key={kind}
        className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background p-4"
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-body-md font-semibold">
            {ref ? t.titleVersion(t.kinds[kind], ref.version) : t.kinds[kind]}
          </p>
          <p className="text-caption text-muted-foreground">
            {kind === "brief" ? f.internal : f.external(f.audiences[kind])}
            {kind === "press_kit" && ` · ${t.optional}`}
          </p>
          <p className="text-caption text-muted-foreground">{t.usage[kind]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={ref ? strategyDocumentTone[ref.state] : "neutral"}
            size="sm"
          >
            {label}
          </StatusBadge>
          {newer && (
            <span className="text-caption text-muted-foreground">
              {f.newer(newer.version)}
            </span>
          )}
        </div>
        {actions}
        {kind !== "brief" && canShare && (
          <ViewLink
            href={generator(kind)}
            className={buttonVariants({
              size: "sm",
              variant: ref ? "ghost" : "outline",
              className: "self-start",
            })}
          >
            {ref ? f.open : f.create}
          </ViewLink>
        )}
      </li>
    );
  };

  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {(["brief", "release_plan", "press_kit"] as const).map(card)}
    </ul>
  );
}

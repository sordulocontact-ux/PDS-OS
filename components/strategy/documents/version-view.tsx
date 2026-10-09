import Link from "next/link";

import { DocumentActions } from "@/components/strategy/documents/document-actions";
import { DocumentHistory } from "@/components/strategy/documents/document-history";
import { DocumentPreview } from "@/components/strategy/documents/document-preview";
import { ReviewPanel } from "@/components/strategy/documents/review-panel";
import { SendForValidation } from "@/components/strategy/documents/send-for-validation";
import { StrategyBriefDocument } from "@/components/strategy/documents/strategy-brief-document";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { strategySnapshotOf } from "@/lib/strategy/brief-snapshot";
import { externalDocOf } from "@/lib/strategy/documents/model";
import { documentFileName } from "@/lib/strategy/documents/names";
import type { StrategyDocument } from "@/lib/strategy/workspace";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

/**
 * One version of a Strategy document (ticket § 11 step 8, § 13): the
 * document as generated, Modifier · Partager · PDF · Demander validation,
 * who validates and where they stand, and every version before it.
 */
export function VersionView({
  projectId,
  projectTitle,
  version,
  versions,
  meId,
  owner,
  director,
  creatives,
  editHref,
  extra,
}: {
  projectId: string;
  projectTitle: string;
  version: StrategyDocument;
  // Every version of the kind, newest first.
  versions: StrategyDocument[];
  meId: string | null;
  // The project's owner: sends, shares, reminds.
  owner: boolean;
  director: string | null;
  creatives: Array<{ personId: string; name: string }>;
  // « Modifier »: back to the generator's recap.
  editHref?: string;
  extra?: React.ReactNode;
}) {
  const t = fr.strategyDocs;
  const external = version.kind !== "brief";
  const latest = versions[0]?.id === version.id;
  const brief =
    version.kind === "brief" ? strategySnapshotOf(version.content) : null;
  const doc = external ? externalDocOf(version.content) : null;
  const state =
    (t.states as Record<string, string>)[version.state] ?? version.state;

  return (
    <div className="flex flex-col gap-6">
      {version.state === "changes_requested" && version.changeComment && (
        <ToneCallout tone="danger">{version.changeComment}</ToneCallout>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          <span>{t.kinds[version.kind]}</span>
          <span aria-hidden>·</span>
          <span className="font-semibold text-foreground">
            {t.version(version.version)}
          </span>
          <StatusBadge
            tone={strategyDocumentTone[version.state] ?? "neutral"}
            size="sm"
          >
            {state}
          </StatusBadge>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {owner && editHref && latest && version.state !== "sent" && (
            <Link
              href={editHref}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {t.generator.edit}
            </Link>
          )}
          {extra}
          {owner && latest && external && version.state === "pending" && (
            <SendForValidation
              projectId={projectId}
              documentId={version.id}
              directorName={director}
              creatives={creatives}
              description={t.validation.externalBody}
            />
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {doc && <DocumentPreview doc={doc} />}
          {brief && (
            <StrategyBriefDocument
              snapshot={brief}
              eyebrow={<span>{t.kinds.brief}</span>}
            />
          )}
        </div>
        <aside className="flex flex-col gap-8 self-start">
          <DocumentActions
            projectId={projectId}
            documentId={version.id}
            external={external}
            canShare={owner && version.state !== "superseded"}
            pdfHref={routes.strategyDocumentPdf(projectId, version.id)}
            fileName={documentFileName(
              version.kind,
              projectTitle,
              version.version,
            )}
          />
          <ReviewPanel
            projectId={projectId}
            documentId={version.id}
            reviews={version.reviews}
            planned={version.state === "pending" && director ? [director] : []}
            meId={meId}
            canRemind={owner}
          />
          <DocumentHistory
            versions={versions}
            hrefOf={(v) =>
              routes.projectStrategyDocument(projectId, v.kind, v.id)
            }
            currentId={version.id}
          />
        </aside>
      </div>
    </div>
  );
}

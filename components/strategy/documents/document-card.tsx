import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { DocumentActions } from "@/components/strategy/documents/document-actions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { documentFileName } from "@/lib/strategy/documents/names";
import type { DocumentKind, StrategyDocument } from "@/lib/strategy/workspace";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

/**
 * One of the three documents (ticket § 10 and § 13): its audience, the
 * version that counts (the approved one, else the latest), its state, and
 * Voir · Partager · PDF · Versions; « À générer » until a version exists.
 */
export function DocumentCard({
  projectId,
  projectTitle,
  kind,
  versions,
  generatorHref,
  generatorLabel,
  lockedReason,
  canShare,
}: {
  projectId: string;
  projectTitle: string;
  kind: DocumentKind;
  // Newest first.
  versions: StrategyDocument[];
  // Where the document is made (the Brief page, a generator); none to read only.
  generatorHref: string | null;
  generatorLabel: string;
  // Why it cannot be made yet (Brief not validated, waiting for reviewers).
  lockedReason: string | null;
  canShare: boolean;
}) {
  const t = fr.strategyDocs;
  const current =
    versions.find((v) => v.state === "approved") ?? versions[0] ?? null;
  const latest = versions[0] ?? null;
  const external = kind !== "brief";

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-body-lg font-semibold">{t.kinds[kind]}</h3>
          <p className="text-caption text-muted-foreground">
            {t.audiences[kind]}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-2">
          {current ? (
            <>
              {current.state === "approved" && (
                <IconCheck
                  aria-hidden
                  className="size-4 text-[color:var(--tone-success-fg)]"
                />
              )}
              <StatusBadge
                tone={strategyDocumentTone[current.state] ?? "neutral"}
                size="sm"
              >
                {(t.states as Record<string, string>)[current.state] ??
                  current.state}
              </StatusBadge>
              <span className="text-caption font-semibold tabular-nums">
                {t.version(current.version)}
              </span>
            </>
          ) : (
            <StatusBadge tone="neutral" size="sm">
              {t.states.toGenerate}
            </StatusBadge>
          )}
        </span>
      </div>

      {latest && current && latest.id !== current.id && (
        <p className="text-caption text-muted-foreground">
          {t.version(latest.version)} ·{" "}
          {(t.states as Record<string, string>)[latest.state] ?? latest.state}
        </p>
      )}

      {lockedReason && !current && (
        <p className="text-caption text-muted-foreground">{lockedReason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {current && (
          <DocumentActions
            projectId={projectId}
            documentId={current.id}
            external={external}
            canShare={canShare}
            viewHref={routes.projectStrategyDocument(
              projectId,
              kind,
              current.id,
            )}
            versionsHref={routes.projectStrategyDocument(projectId, kind)}
            pdfHref={routes.strategyDocumentPdf(projectId, current.id)}
            fileName={documentFileName(kind, projectTitle, current.version)}
          />
        )}
        {generatorHref && !lockedReason && (
          <Link
            href={generatorHref}
            className={buttonVariants({
              size: "sm",
              variant: current ? "ghost" : "default",
            })}
          >
            {current ? generatorLabel : t.actions.generate}
          </Link>
        )}
      </div>
    </li>
  );
}

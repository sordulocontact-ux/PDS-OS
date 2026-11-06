import Link from "next/link";

import { DocumentHistory } from "@/components/strategy/documents/document-history";
import { ReviewPanel } from "@/components/strategy/documents/review-panel";
import { SendForValidation } from "@/components/strategy/documents/send-for-validation";
import { ShareButton } from "@/components/strategy/release-plan/share-button";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { formatDay } from "@/lib/assistant/facts";
import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";
import { pressKitHtml } from "@/lib/strategy/documents/press-kit-html";
import { pressKitOf } from "@/lib/strategy/documents/press-kit-model";
import { releasePlanHtml } from "@/lib/strategy/documents/release-plan-html";
import { releasePlanOf } from "@/lib/strategy/documents/release-plan-model";

/** A stored version as HTML, by kind; null when it cannot be read. */
function htmlOf(kind: GeneratorKind, content: unknown): string | null {
  if (kind === "press_kit") {
    const doc = pressKitOf(content);
    return doc ? pressKitHtml(doc) : null;
  }
  const doc = releasePlanOf(content);
  return doc ? releasePlanHtml(doc) : null;
}
import { strategyDocumentTone } from "@/lib/ui/state-tones";

const fr = { strategyReleasePlan, strategyPressKit };

/**
 * The last step of a generator (ticket § 11 and § 12): the generated
 * document page by page (a sandboxed
 * iframe: the same HTML as the shared link and the PDF, no script), its
 * versions, and Modifier · Partager · Exporter PDF · Demander validation.
 * A version is never rewritten: regenerating makes the next one.
 */
export function PreviewStep({
  projectId,
  versions,
  current,
  canEdit,
  meId,
  directorName,
  creatives,
  generate,
  kind = "release_plan",
}: {
  projectId: string;
  kind?: GeneratorKind;
  // Newest first, without the superseded ones.
  versions: StrategyDocument[];
  current: StrategyDocument | null;
  canEdit: boolean;
  meId: string | null;
  directorName: string | null;
  creatives: Array<{ personId: string; name: string }>;
  // « Générer une nouvelle version », for the owner.
  generate: React.ReactNode;
}) {
  const t = fr.strategyReleasePlan.preview;
  // The texts naming the document itself.
  const own = kind === "press_kit" ? fr.strategyPressKit.preview : t;
  const href = (step: number) =>
    kind === "press_kit"
      ? routes.projectStrategyPressKit(projectId, step)
      : routes.projectStrategyReleasePlan(projectId, step);
  const html = current ? htmlOf(kind, current.content) : null;
  if (!current || !html)
    return (
      <section className="flex flex-col items-start gap-4">
        <h2 className="text-display-sm font-semibold">{own.title}</h2>
        <ToneCallout tone="neutral">{own.none}</ToneCallout>
        {generate}
      </section>
    );
  return (
    <section aria-labelledby="preview-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="preview-title" className="text-display-sm font-semibold">
              {own.title} · {t.version(current.version)}
            </h2>
            <StatusBadge tone={strategyDocumentTone[current.state]} size="sm">
              {t.states[current.state]}
            </StatusBadge>
          </div>
          <p className="text-caption text-muted-foreground">
            {t.generatedOn(formatDay(current.createdAt.slice(0, 10)))}
          </p>
        </div>
        {versions.length > 1 && (
          <SegmentedLinks
            label={t.versions}
            className="self-start"
            options={versions.map((v) => ({
              key: v.id,
              current: v.id === current.id,
              href: `${href(8)}&v=${v.version}`,
              label: t.version(v.version),
            }))}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link
            href={href(6)}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <ButtonRoll>{t.edit}</ButtonRoll>
          </Link>
        )}
        {canEdit && (
          <ShareButton projectId={projectId} documentId={current.id} />
        )}
        <a
          href={routes.projectStrategyDocumentPdf(projectId, current.id)}
          download
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          <ButtonRoll>{t.pdf}</ButtonRoll>
        </a>
        {canEdit && current.state === "pending" && (
          <SendForValidation
            projectId={projectId}
            target={{ documentId: current.id }}
            directorName={directorName}
            creatives={creatives}
            title={own.requestTitle}
            description={own.requestBody}
          />
        )}
        {generate}
      </div>

      {current.state !== "pending" && current.reviews.length > 0 && (
        <ReviewPanel
          projectId={projectId}
          documentId={current.id}
          reviews={current.reviews}
          requestNote={current.requestNote}
          meId={meId}
          canRemind={canEdit && current.state === "sent"}
        />
      )}

      <iframe
        title={own.frameTitle(current.version)}
        srcDoc={html}
        sandbox=""
        className="h-[80vh] w-full rounded-2xl border border-border bg-muted"
      />

      {/* « Versions »: every version kept, with its state and decisions. */}
      <div id="versions" className="scroll-mt-6">
        <DocumentHistory
          versions={versions}
          currentId={current.id}
          hrefOf={(v) => `${href(8)}&v=${v.version}`}
        />
      </div>
    </section>
  );
}

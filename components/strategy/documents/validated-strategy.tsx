import { StrategyDocumentCards } from "@/components/strategy/documents/strategy-document-cards";
import { FollowUpLink } from "@/components/strategy/follow-up/follow-up-link";
import { sectionCardClass } from "@/components/ui/section-card";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { allFinalised } from "@/lib/strategy/documents/model";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { cn } from "@/lib/utils";

/**
 * The validated strategy's screen (ticket § 10 and § 13, MKT-C2-01): where
 * it stands, then its one next action — `next`, the Conception — before
 * the three documents (« Documents finalisés » once each has an approved
 * version), the reserves still open (`reserves`), the follow-up, then the
 * other steps — Activations, Planning — each opening its page. Nothing has
 * to start now: the validation obliges no next step.
 */
export function ValidatedStrategy({
  projectId,
  version,
  documents,
  canShare,
  next,
  reserves,
}: {
  projectId: string;
  // The project's owner: creates the external documents' public links.
  canShare: boolean;
  // The reference Brief's version (V1, V2…).
  version: number;
  documents: StrategyDocument[];
  // The next action (ConceptionNextStep), visible without scrolling.
  next: React.ReactNode;
  // The reserves of the validation, while one is still open.
  reserves?: React.ReactNode;
}) {
  const t = fr.strategyDocuments.validated;
  const done = allFinalised(documents);
  const f = fr.strategyPressKit.finalised;
  const c = t.consequences;
  const steps = [
    {
      key: "activations",
      href: routes.projectActivations(projectId),
      ...c.activations,
    },
    { key: "planning", href: routes.projectPlanning(projectId), ...c.planning },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="validated-title"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h2 id="validated-title" className="text-display-sm font-semibold">
            {done ? f.title : t.title}
          </h2>
          <p className="max-w-prose text-body-md text-muted-foreground">
            {done ? f.body : t.body(version)}
          </p>
        </div>
        {next}
        <h3 className="sr-only">{t.documents}</h3>
        <StrategyDocumentCards
          projectId={projectId}
          documents={documents}
          canShare={canShare}
        />
      </section>

      {reserves}

      {/* After the launch, the Stratégie watches and adapts (ticket § 14). */}
      <FollowUpLink projectId={projectId} />

      <section
        aria-labelledby="validated-next"
        className={cn(sectionCardClass, "flex flex-col gap-4")}
      >
        <div className="flex flex-col gap-1">
          <h2 id="validated-next" className="text-body-md font-semibold">
            {t.consequencesTitle}
          </h2>
          <p className="text-caption text-muted-foreground">
            {t.consequencesBody}
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {steps.map((n) => (
            <li key={n.key}>
              <ViewLink
                href={n.href}
                className="flex h-full flex-col gap-1 rounded-2xl px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]"
              >
                <span className="text-body-md font-semibold">{n.title}</span>
                <span className="text-caption text-muted-foreground">
                  {n.body}
                </span>
              </ViewLink>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

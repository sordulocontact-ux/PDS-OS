import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { Demarche } from "@/lib/legal/demarches/build";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { LEGAL_READY_KEY } from "@/lib/ui/legal-steps";

const t = fr.legalDemarches.ready;

/**
 * « Prêt pour la sortie » (ticket Juridique 08), the Sortie of the journey:
 * computed at each read from the démarches. A borrowing not secured blocks
 * the release; every other open démarche stays to follow.
 */
export async function ReadyStep({ projectId }: { projectId: string }) {
  const { demarches, board } = await legalJourneyContext(projectId);
  const open = (d: Demarche) =>
    !d.proposed && d.step.status !== "done" && d.step.status !== "obsolete";
  const blocking = demarches.filter((d) => open(d) && d.kind === "clearance");
  const remaining = demarches.filter((d) => open(d) && d.kind !== "clearance");
  const verdict =
    blocking.length > 0 ? "no" : remaining.length > 0 ? "risk" : "ok";
  return (
    <LegalStepFrame projectId={projectId} stepKey={LEGAL_READY_KEY}>
      {board && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <StatusBadge
              tone={
                verdict === "no"
                  ? "danger"
                  : verdict === "risk"
                    ? "warning"
                    : "success"
              }
              className="self-start"
            >
              {t.verdict[verdict]}
            </StatusBadge>
          </div>
          <ReadyList
            title={fr.legal.tracking.readiness.title}
            rows={blocking}
          />
          <ReadyList title={t.verdict.risk} rows={remaining} />
        </div>
      )}
    </LegalStepFrame>
  );
}

function ReadyList({ title, rows }: { title: string; rows: Demarche[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {title}
      </h3>
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)]">
        {rows.map((d) => (
          <li
            key={d.step.key}
            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
          >
            <span className="min-w-0 text-[length:var(--type-body-sm)] font-medium">
              {d.step.title}
            </span>
            <ViewLink
              href={d.step.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {fr.journey.now.openShort}
            </ViewLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

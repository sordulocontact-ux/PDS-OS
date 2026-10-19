import { ControlRow } from "@/components/legal/readiness/control-row";
import {
  SacemPolicyToggle,
  ValidateReleaseButton,
} from "@/components/legal/readiness/readiness-gestures";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import {
  READINESS_DOMAINS,
  type ReadinessControl,
} from "@/lib/legal/readiness/controls";
import { LEGAL_READY_KEY } from "@/lib/ui/legal-steps";

const t = fr.legalReadiness;
const VERDICT_TONE = { no: "danger", risk: "warning", ok: "success" } as const;

/**
 * « Prêt pour la sortie » (ticket Juridique 08, proto « Projet complet »),
 * the Sortie of the journey: the verdict, what must be resolved before the
 * release, what stays to follow, every control by domain, the label's
 * policy and the direction's final validation before The Orchard.
 */
export async function ReadyStep({ projectId }: { projectId: string }) {
  const { readiness, clearances } = await legalJourneyContext(projectId);
  const canDecide = clearances.canValidate;
  const r = readiness;
  return (
    <LegalStepFrame projectId={projectId} stepKey={LEGAL_READY_KEY}>
      {r && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <StatusBadge tone={VERDICT_TONE[r.verdict]} className="self-start">
              {fr.legalDemarches.ready.verdict[r.verdict]}
            </StatusBadge>
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {r.verdict === "no"
                ? t.verdictBody.no(r.blocking.length)
                : t.verdictBody[r.verdict]}
            </p>
          </div>
          <Controls
            title={t.blockingTitle}
            rows={r.blocking}
            projectId={projectId}
            canDecide={canDecide && !r.validated}
          />
          <Controls
            title={t.followTitle}
            rows={r.toFollow}
            projectId={projectId}
            canDecide={canDecide && !r.validated}
          />
          <details className="group rounded-xl border border-[color:var(--border-hairline)] px-3.5 py-2.5">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 marker:hidden">
              <span className="text-[length:var(--type-body-sm)] font-semibold">
                {t.all}
              </span>
              <span className="text-[length:var(--type-micro)] text-[color:var(--text-secondary)] tabular-nums">
                {t.allCount(r.done, r.total)}
              </span>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              {READINESS_DOMAINS.map((domain) => {
                const rows = r.controls.filter((c) => c.domain === domain);
                return rows.length > 0 ? (
                  <Controls
                    key={domain}
                    title={t.domains[domain]}
                    rows={rows}
                    projectId={projectId}
                    canDecide={false}
                  />
                ) : null;
              })}
            </div>
          </details>
          <section className="flex flex-col gap-1.5 rounded-xl bg-[var(--surface-soft)] p-3.5">
            <h3 className="text-[length:var(--type-body-sm)] font-semibold">
              {t.policy.title}
            </h3>
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.policy.body(r.sacemBlocks)}
            </p>
            <span className="text-[length:var(--type-micro)] text-[color:var(--text-tertiary)]">
              {t.policy.by}
            </span>
            {canDecide && !r.validated && (
              <SacemPolicyToggle
                projectId={projectId}
                sacemBlocks={r.sacemBlocks}
              />
            )}
          </section>
          {r.validated ? (
            <ToneCallout tone="success">
              {t.validate.by(r.validated.by, r.validated.at)}
            </ToneCallout>
          ) : canDecide && r.verdict !== "no" ? (
            <ValidateReleaseButton projectId={projectId} />
          ) : (
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.validate.closed}
            </p>
          )}
        </div>
      )}
    </LegalStepFrame>
  );
}

function Controls({
  title,
  rows,
  projectId,
  canDecide,
}: {
  title: string;
  rows: ReadinessControl[];
  projectId: string;
  canDecide: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {title}
      </h3>
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)]">
        {rows.map((c) => (
          <ControlRow
            key={c.key}
            projectId={projectId}
            control={c}
            canDecide={canDecide}
          />
        ))}
      </ul>
    </section>
  );
}

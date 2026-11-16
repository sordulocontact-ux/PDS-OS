import { ControlRow } from "@/components/legal/readiness/control-row";
import {
  SacemPolicyToggle,
  ValidateReleaseButton,
} from "@/components/legal/readiness/readiness-gestures";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { StepSection } from "@/components/shell/journey/step-section";
import { Fold } from "@/components/ui/fold";
import { StatCards } from "@/components/ui/stat-cards";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalReadiness } from "@/lib/i18n/fr/legal-readiness";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import {
  READINESS_DOMAINS,
  type LegalReadiness,
  type ReadinessControl,
} from "@/lib/legal/readiness/controls";
import { LEGAL_READY_KEY } from "@/lib/ui/legal-steps";
import { formatDay } from "@/lib/utils/day";

const fr = { legalDemarches, legalReadiness };

const t = fr.legalReadiness;
const muted =
  "text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]";

/**
 * « Prêt pour la sortie » (ticket Juridique 08, recette Juridique V1,
 * JUR-07): at the top, where the release stands — not ready, ready to be
 * validated, validated, delivered to the distributor —, the direction's
 * decision and the next action, then three figures (the direction's
 * validation is the decision, not a control counted); the blocks and the
 * points to follow only when there are some; every control by domain and
 * the label's policy folded.
 */
export async function ReadyStep({ projectId }: { projectId: string }) {
  const { readiness, clearances } = await legalJourneyContext(projectId);
  const canDecide = clearances.canValidate;
  const r = readiness;
  return (
    <LegalStepFrame projectId={projectId} stepKey={LEGAL_READY_KEY}>
      {r && (
        <div className="flex flex-col gap-3.5 modern:gap-4">
          <Verdict r={r} canDecide={canDecide} />
          {!r.validated &&
            canDecide &&
            (r.verdict !== "no" ? (
              <div className="flex flex-col gap-1.5">
                <ValidateReleaseButton projectId={projectId} />
                <p className={muted}>
                  {t.head.validateNote(r.toFollow.length)}
                </p>
              </div>
            ) : (
              <p className={muted}>{t.validate.closed}</p>
            ))}
          <StatCards
            columns={3}
            stats={[
              {
                label: t.tiles.controls,
                value: t.tiles.controlsValue(r.counted.ok, r.counted.total),
              },
              {
                label: t.tiles.blocking,
                value: String(r.blocking.length),
                hint: t.tiles.blockingHint(r.blocking.length),
              },
              {
                label: t.tiles.follow,
                value: String(r.toFollow.length),
                hint: t.tiles.followHint(r.toFollow.length),
              },
            ]}
          />
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
          <Fold summary={`${t.all} · ${t.allCount(r.done, r.total)}`}>
            <div className="flex flex-col gap-3">
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
              <section className="flex flex-col gap-1.5 rounded-xl bg-[var(--surface-soft)] p-3.5 modern:p-4">
                <h4 className="text-[length:var(--type-body-sm)] font-semibold">
                  {t.policy.title}
                </h4>
                <p className={muted}>{t.policy.body(r.sacemBlocks)}</p>
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
            </div>
          </Fold>
        </div>
      )}
    </LegalStepFrame>
  );
}

/** The release's state at the top, with the decision and the next action
 * (not said when it is the reader's own: « À vous » already says it). */
function Verdict({ r, canDecide }: { r: LegalReadiness; canDecide: boolean }) {
  const h = t.head;
  const first = r.blocking[0];
  const [tone, title, body] = r.deliveredOn
    ? ([
        "success",
        h.delivered,
        h.deliveredBody(formatDay(r.deliveredOn)),
      ] as const)
    : r.validated
      ? ([
          "success",
          h.validated,
          h.validatedBody(r.validated.by, r.validated.at),
        ] as const)
      : r.verdict === "no"
        ? (["danger", h.no, h.undecided] as const)
        : (["warning", h.ready, h.undecided] as const);
  const next = r.deliveredOn
    ? null
    : r.validated
      ? h.next(h.distribution, h.nextDeliver)
      : first
        ? h.next(first.responsible ?? h.distribution, first.next ?? first.label)
        : canDecide
          ? null
          : h.next(fr.legalDemarches.direction, h.nextValidate);
  return (
    <ToneCallout tone={tone} as="div" contentClassName="flex flex-col gap-1">
      <h3 className="font-semibold">{title}</h3>
      <p>{body}</p>
      {next && <p>{next}</p>}
    </ToneCallout>
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
    <StepSection title={title}>
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)] bg-card">
        {rows.map((c) => (
          <ControlRow
            key={c.key}
            projectId={projectId}
            control={c}
            canDecide={canDecide}
          />
        ))}
      </ul>
    </StepSection>
  );
}

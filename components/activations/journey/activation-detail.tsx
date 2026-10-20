import { MetricsSection } from "@/components/activations/metrics/metrics-section";
import {
  ResultBanner,
  StepResultProvider,
} from "@/components/shell/module/result-banner";
import { PhaseStrip } from "@/components/ui/phase-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { isGated, phaseLabel, phaseOf } from "@/lib/activations/phase";
import type { ActivationPeople } from "@/lib/activations/people";
import { lastStatusEvent } from "@/lib/activations/status-events";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { formatShortDay } from "@/lib/utils/day";

import { ActivationModule } from "./activation-module";
import { Informations } from "./informations";
import { LifeButtons } from "./life-buttons";
import { NowBox } from "./now-box";
import { TrunkNow } from "./trunk-now";

const t = fr.activationJourney;

/**
 * The open activation, on the right (proto actDetail + actBody): its title
 * and state, why it exists, the big frieze; then what holds it (a
 * prerequisite, a cancellation), « Maintenant », its module (influence,
 * press, agency) in folded cards, its snapshots, « Informations » folded,
 * « Suspendre » / « Annuler l'activation ».
 */
export async function ActivationDetail({
  fiche,
  access,
  people,
  briefVersion,
}: {
  fiche: ActivationFiche;
  access: Access;
  people: ActivationPeople;
  briefVersion: number | null;
}) {
  const { activation: a, board, project, canWrite, canValidate } = fiche;
  const projectId = project.id;
  const phase = phaseOf(a);
  const gated = isGated(a);
  const pill =
    a.status === "suspended"
      ? { tone: "warning" as const, label: t.detail.pills.suspended }
      : a.status === "cancelled"
        ? { tone: "neutral" as const, label: t.detail.pills.cancelled }
        : gated || a.status === "blocked"
          ? { tone: "danger" as const, label: t.detail.pills.blocked }
          : null;
  const cancelled =
    a.status === "cancelled"
      ? await lastStatusEvent(a.id, "cancelled", people.members)
      : null;
  const open = a.status !== "closed" && a.status !== "cancelled";
  const taskRules = board.data.nextActions
    .filter((n) => n.activation_id === a.id && n.task_id)
    .map((n) => n.origin.replace(/^rule:/, ""));
  const pressSent = board.modules.messages.some(
    (m) =>
      m.activation_id === a.id && m.target_id && m.status === "sent_declared",
  );
  const metrics = board.data.metrics.filter((m) => m.activationId === a.id);
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId,
    activationId: a.id,
  };
  const trunk = a.actions.find((x) => x.key.startsWith("trunk:"));
  const missing = [
    !a.ownerPersonId ? t.detail.anOwner : null,
    !a.dueOn ? t.detail.aDue : null,
  ].filter(Boolean) as string[];

  return (
    <section
      aria-labelledby="activation-title"
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5 md:p-6"
    >
      <StepResultProvider>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            id="activation-title"
            className="min-w-0 text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] break-words"
          >
            {a.title}
          </h2>
          {pill && <StatusBadge tone={pill.tone}>{pill.label}</StatusBadge>}
        </div>
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.why[a.kind]}
        </p>
        <PhaseStrip
          phases={t.phases}
          current={Math.min(phase, t.phases.length)}
          label={t.phaseAria(phaseLabel(a))}
          big
        />
        <ResultBanner />
        {gated ? (
          <ToneCallout tone="neutral">
            {t.detail.gateBlocker(a.waitsFor ?? "")}
          </ToneCallout>
        ) : (
          <>
            {a.status === "cancelled" && (
              <ToneCallout tone="neutral">
                {cancelled?.by
                  ? t.detail.cancelled(
                      cancelled.by,
                      formatShortDay(cancelled.at, { bare: true }),
                      a.statusReason ?? "",
                    )
                  : t.detail.cancelledShort(a.statusReason ?? "")}
              </ToneCallout>
            )}
            {a.status === "blocked" && a.statusReason && (
              <ToneCallout tone="danger">
                {t.detail.blocked(a.statusReason)}
              </ToneCallout>
            )}
            {a.status === "to_prepare" && (
              <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                {missing.length > 0
                  ? t.detail.toLaunchMissing(missing.join(t.detail.and))
                  : t.detail.toLaunchReady}
              </p>
            )}
            <NowBox
              projectId={projectId}
              activation={a}
              gesture={
                trunk?.who.viewer && (
                  <TrunkNow
                    projectId={projectId}
                    activation={a}
                    people={people}
                    evidences={board.data.evidences}
                    pressSent={pressSent}
                  />
                )
              }
              taskRules={taskRules}
              showTools={canWrite || Boolean(a.actions[0]?.who.viewer)}
            />
            <ActivationModule
              fiche={fiche}
              access={access}
              people={people}
              briefVersion={briefVersion}
            />
            {(metrics.length > 0 || a.status === "done_declared") && (
              <MetricsSection
                scope={scope}
                metrics={metrics}
                canWrite={canWrite}
                canVerify={canValidate}
                today={todayInParis()}
                title={t.snapshot.listTitle}
              />
            )}
          </>
        )}
        <Informations
          fiche={fiche}
          access={access}
          briefVersion={briefVersion}
        />
        {open && canWrite && (
          <LifeButtons
            projectId={projectId}
            activationId={a.id}
            title={a.title}
            canSuspend={a.status !== "suspended"}
          />
        )}
      </StepResultProvider>
    </section>
  );
}

import { IconLock } from "nucleo-sharp-essential";

import {
  ResultBanner,
  StepResultProvider,
} from "@/components/shell/module/result-banner";
import { Fold } from "@/components/ui/fold";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import {
  isLocked,
  type JourneyStep,
  LEAD_ANCHOR,
  prereqsOf,
  withModule,
} from "@/lib/ui/journey";
import { journeyStatusTone, type Tone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

import { StepMeta } from "./step-meta";

const t = fr.journey;

/**
 * The parts of an open step, in the order the proto shows them, each only
 * if given (docs/VISION-UX.md § 4): the reason of a return (signed), the
 * reported blockers, « À revoir après un changement », PO's box, the result
 * banner of the last gesture (just above the content, where the gesture
 * is; ResultBanner by default), the step's content (facts, what is missing, the action), its final
 * result, the noted informations, the tools (« Signaler un blocage »,
 * « Noter une information ») and, at the very bottom, « Déjà fait »
 * (StepHistory).
 *
 * `lead`: the viewer's gesture, given when the step's page puts it first
 * (lot 4 of Ibé's feedback: « l'action attendue en tête de page, les
 * informations secondaires repliées »). It comes right under the « why »,
 * named by the step's action (« À vous · Valider le Mix V1 ») and anchored
 * (`#a-vous`, where Travail opens it); the result banner moves above it and
 * the grid folds under it.
 */
export type StepSlots = {
  lead?: React.ReactNode;
  returned?: React.ReactNode;
  blockers?: React.ReactNode;
  review?: React.ReactNode;
  po?: React.ReactNode;
  flash?: React.ReactNode;
  result?: React.ReactNode;
  notes?: React.ReactNode;
  tools?: React.ReactNode;
  history?: React.ReactNode;
};

/**
 * One step of the journey, as the right side of a module, all in one card
 * (proto « Projet complet »): its title and state, why it matters, the grid
 * (who executes, coordinates, validates — or who is responsible — what it
 * needs, even in another module, and what follows), then its slots. A
 * locked step says what unlocks it and shows its content read-only (inert):
 * nothing to do there yet.
 */
export function StepPanel({
  step,
  steps,
  rootPrereq,
  blockedLabel = t.blocked,
  badge,
  children,
  ...slots
}: StepSlots & {
  step: JourneyStep;
  steps: JourneyStep[];
  // Replaces the state's pill when the module says more (Distribution:
  // « Prêt pour contrôle », « Clôturée avec réserves (3) »).
  badge?: { tone: Tone; label: string };
  // Shown when the step needs nothing before it.
  rootPrereq?: string;
  // Replaces « Se débloque quand … » (Marketing: « S'ouvre quand … »).
  blockedLabel?: (prereqs: string) => string;
  children?: React.ReactNode;
}) {
  const locked = isLocked(step.status);
  const missing = prereqsOf(step, steps)
    .filter((p) => !p.done)
    .map(withModule);
  // A gesture the viewer has stays usable on a locked step (an invoice to
  // pay never waits for the mastering).
  const lead =
    slots.lead && (!locked || step.actor?.viewer) ? slots.lead : null;
  const meta = <StepMeta step={step} steps={steps} rootPrereq={rootPrereq} />;
  const banner = slots.flash ?? <ResultBanner />;
  return (
    <StepResultProvider>
      <section
        aria-labelledby="journey-step-title"
        className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2
            id="journey-step-title"
            className="text-[length:var(--type-figure-lg)] leading-[var(--type-figure-lg-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance"
          >
            {step.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {step.due && step.status !== "done" && (
              <span
                className={cn(
                  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]",
                  step.alert === "overdue" &&
                    "font-semibold text-[color:var(--tone-danger-fg)]",
                )}
              >
                {t.meta.due(formatDay(step.due))}
              </span>
            )}
            <StatusBadge tone={badge?.tone ?? journeyStatusTone[step.status]}>
              {badge?.label ?? t.status[step.status]}
            </StatusBadge>
          </div>
        </div>
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {step.why}
        </p>
        {lead ? (
          <>
            {banner}
            <section
              id={LEAD_ANCHOR}
              {...(step.actor?.viewer
                ? { "aria-labelledby": "journey-step-lead" }
                : { "aria-label": t.now.mine })}
              className="flex scroll-mt-24 flex-col gap-3.5 rounded-xl border border-[color:var(--selection-border)] bg-[color:var(--selection-bg)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info">{t.now.mine}</StatusBadge>
                {step.actor?.viewer && (
                  <h3
                    id="journey-step-lead"
                    className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold"
                  >
                    {step.actor.todo}
                  </h3>
                )}
              </div>
              {lead}
            </section>
            <Fold summary={t.lead.meta}>{meta}</Fold>
          </>
        ) : (
          meta
        )}
        {locked && missing.length > 0 && (
          <ToneCallout tone="info" icon={<IconLock />}>
            {blockedLabel(missing.join(" et "))}
          </ToneCallout>
        )}
        {slots.returned}
        {slots.blockers}
        {slots.review}
        {slots.po}
        {/* The last gesture's result, just above where it was made. */}
        {!lead && banner}
        {children &&
          (locked ? (
            // Readable, never actionable (VISION-UX § 4).
            <div inert className="flex flex-col gap-3.5 opacity-70">
              {children}
            </div>
          ) : (
            children
          ))}
        {slots.result}
        {slots.notes}
        {!locked && slots.tools}
        {slots.history}
      </section>
    </StepResultProvider>
  );
}

import { IconLock } from "nucleo-sharp-essential";

import {
  ResultBanner,
  StepResultProvider,
} from "@/components/shell/module/result-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { journey } from "@/lib/i18n/fr/journey";
import {
  isLocked,
  type JourneyStep,
  LEAD_ANCHOR,
  prereqsOf,
  withModule,
} from "@/lib/ui/journey";
import type { Tone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

const fr = { journey };

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
 * (`#a-vous`, where Travail opens it); the result banner moves above it.
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
 * (proto « Projet complet »): its title and due date, why it matters, then its
 * slots. No grid of who does what nor « À vous : … » line (Ibé, 03/11/2026:
 * too much noise): the journey beside it already says who acts and on what,
 * the lead names the viewer's gesture. A locked step says what unlocks it
 * and shows its content read-only (inert): nothing to do there yet.
 */
export function StepPanel({
  step,
  steps,
  blockedLabel = t.blocked,
  badge,
  children,
  ...slots
}: StepSlots & {
  step: JourneyStep;
  steps: JourneyStep[];
  // A pill when the module says more than the state (Distribution:
  // « Prêt pour contrôle », « Clôturée avec réserves (3) »). The state
  // itself has no pill: the journey and the card already say it (Ibé,
  // 03/11/2026).
  badge?: { tone: Tone; label: string };
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
            {badge && (
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            )}
          </div>
        </div>
        {step.why && (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {step.why}
          </p>
        )}
        {lead && (
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
          </>
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

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

import { StepWaiting } from "./step-waiting";

const fr = { journey };

const t = fr.journey;

/**
 * The parts of an open step, in the order the proto shows them, each only
 * if given (docs/VISION-UX.md § 4): the reason of a return (signed), the
 * reported blockers, « À revoir après un changement », PO's box, the result
 * banner of the last gesture (just above the content, where the gesture
 * is; ResultBanner by default), the step's content (facts, what is missing, the action), its final
 * result, the noted informations, the tools (« Signaler un blocage »,
 * « Noter une information »).
 *
 * `lead`: the viewer's gesture, given when the step's page puts it first
 * (lot 4 of Ibé's feedback: « l'action attendue en tête de page, les
 * informations secondaires repliées »), anchored (`#a-vous`, where Travail
 * opens it); the result banner moves above it. No « À vous · … » line above
 * it: the gesture's own button says it, the journey marks the step « À vous »
 * (Sacha, 06 and 10/11/2026).
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
};

/**
 * One step of the journey, on the right of the spine, without a card (proto
 * « Mise en page des modules », Sacha 10/11/2026): the page's head already
 * names it (h1 = the step's title, its why, its due date: ProjectHeader
 * `head`), so the panel holds its slots only. A step waiting for someone
 * else says it first (« En attente de … », StepWaiting) unless the page says
 * it itself, more precisely. A locked step says what unlocks it and shows
 * its content read-only (inert): nothing to do there yet.
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
  // « Prêt pour contrôle », « Clôturée avec réserves (3) »), first in the
  // step. The state itself has no pill: the journey already says it (Ibé,
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
  const waits =
    !locked && ["current", "waiting", "rework"].includes(step.status);
  return (
    <StepResultProvider>
      <section
        aria-label={step.title}
        className="group/step flex min-w-0 flex-col gap-3.5"
      >
        {badge && (
          <StatusBadge tone={badge.tone} className="self-start">
            {badge.label}
          </StatusBadge>
        )}
        {waits && <StepWaiting step={step} auto />}
        {lead && (
          <>
            {banner}
            <section
              id={LEAD_ANCHOR}
              aria-label={step.actor?.todo ?? t.now.mine}
              // No frame of its own (Sacha, 04/11/2026: « le fond bleu
              // non »). Well apart from what follows (« Ce que PDS OS a
              // vérifié »…, Sacha 09/11/2026).
              className="mb-4 flex scroll-mt-24 flex-col gap-3.5"
            >
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
        {/* The rarely used footer (notes, « Signaler un blocage » / « Noter
            une information »): well apart from the content. */}
        <div className="mt-6 flex flex-col gap-3.5 empty:hidden">
          {slots.notes}
          {!locked && slots.tools}
        </div>
      </section>
    </StepResultProvider>
  );
}

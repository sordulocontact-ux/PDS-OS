import { fr } from "@/lib/i18n/fr";
import { lowerFirst, type JourneyStep } from "@/lib/ui/journey";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/**
 * « En attente de **Claire Morel** : approuver le bilan provisoire » at the
 * foot of an open step whose action is someone else's (proto `waits()`):
 * nothing when the viewer acts, or nobody does.
 */
export function StepWaiting({ step }: { step: JourneyStep }) {
  const who = step.actor && !step.actor.viewer ? step.actor.name : null;
  if (!who || !step.actor) return null;
  return (
    <p className="flex items-center gap-2.5 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold"
      >
        {initials(who)}
      </span>
      <span className="min-w-0 flex-1">
        {fr.journey.now.waitingOfName(who)}
        <b className="font-semibold">{who}</b>
        {fr.reviewJourney.waiting(lowerFirst(step.actor.todo))}
      </span>
    </p>
  );
}

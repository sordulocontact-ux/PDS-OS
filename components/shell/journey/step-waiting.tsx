import { fr } from "@/lib/i18n/fr";
import { lowerFirst, type JourneyStep } from "@/lib/ui/journey";

/** « CM » for Claire Morel: the avatar of who is awaited. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/**
 * « En attente de **Claire Morel** : approuver le bilan provisoire » in an
 * open step whose next gesture is someone else's (proto `waits()`; lot 3 of
 * Ibé's feedback: said as a state, never as a grey line). Who and what come
 * from the journey's `step`, or are given (`who`, `todo`) where the page has
 * no journey step at hand; nothing when the viewer acts, or nobody does.
 */
export function StepWaiting(
  props:
    { step: JourneyStep | undefined } | { who: string | null; todo: string },
) {
  const actor = "step" in props ? props.step?.actor : null;
  const who =
    "step" in props ? (actor && !actor.viewer ? actor.name : null) : props.who;
  const todo = "step" in props ? (actor?.todo ?? "") : props.todo;
  if (!who) return null;
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
        {actor?.viaLink && (
          <span className="text-[color:var(--text-secondary)]">
            {" "}
            ({fr.journey.privateLink})
          </span>
        )}
        {fr.journey.now.waitingOn(lowerFirst(todo))}
      </span>
    </p>
  );
}

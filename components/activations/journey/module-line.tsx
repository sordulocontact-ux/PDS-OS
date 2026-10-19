import type { ActivationAction } from "@/lib/activations/journey";
import { fr } from "@/lib/i18n/fr";
import { lowerFirst } from "@/lib/ui/journey";

const t = fr.activationJourney.now;
const tj = fr.journey.now;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** « À vous · accepter les conditions · Noa Bessa · plus bas » or « En
 * attente de Léa Moreau (lien privé) : déposer la facture ». */
export function ModuleLine({
  action,
  here = false,
}: {
  action: ActivationAction;
  // In the card where the gesture is: no « plus bas ».
  here?: boolean;
}) {
  const who = action.who;
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-card px-3 py-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold"
      >
        {initials(who.name)}
      </span>
      {who.viewer ? (
        <span className="min-w-0 flex-1">
          <b className="font-semibold">{t.mineElsewhere}</b> ·{" "}
          {action.anchor && action.anchor !== "now" ? (
            <a
              href={`#${action.anchor}`}
              className="underline-offset-4 hover:underline"
            >
              {lowerFirst(action.todo)}
            </a>
          ) : (
            lowerFirst(action.todo)
          )}
          {!here && (
            <span className="text-[color:var(--text-tertiary)]">
              {" "}
              · {t.below}
            </span>
          )}
        </span>
      ) : (
        <span className="min-w-0 flex-1">
          {tj.waitingOfName(who.name)}
          <b className="font-semibold">{who.name}</b>
          {who.viaLink && (
            <span className="text-[color:var(--text-secondary)]">
              {" "}
              ({t.viaLink})
            </span>
          )}
          {" : "}
          {lowerFirst(action.todo)}
        </span>
      )}
    </div>
  );
}

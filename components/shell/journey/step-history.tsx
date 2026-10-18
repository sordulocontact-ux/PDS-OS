import { IconCheck } from "nucleo-sharp-essential";

import { fr } from "@/lib/i18n/fr";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

/** One gesture done on a step, read from the module's journal. */
export type StepHistoryItem = {
  key: string;
  text: string;
  who?: string | null;
  // ISO date or instant: « le 14/10 » or « 19/10, 11:16 ».
  at?: string | null;
  // What it followed (« suite à : la demande de Claire Morel »).
  cause?: string | null;
};

const when = (at: string) =>
  at.includes("T") ? formatShortInstant(at) : formatShortDay(at);

/**
 * « Déjà fait », at the very bottom of an open step (docs/VISION-UX.md § 4,
 * Sacha 17/10): what was done, who did it, when, and after what. The zone
 * reads its own journal and gives the lines; nothing shown without one.
 */
export function StepHistory({
  items,
  title = fr.journey.history,
}: {
  items: StepHistoryItem[];
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-secondary)]">
        {title}
      </h3>
      <ul className="flex flex-col gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2">
            <IconCheck
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-[color:var(--tone-success-fg)]"
            />
            <span className="min-w-0">
              {[
                item.text,
                item.who,
                item.at ? when(item.at) : null,
                item.cause ? fr.journey.historyAfter(item.cause) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

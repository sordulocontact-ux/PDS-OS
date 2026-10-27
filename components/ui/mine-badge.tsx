import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import { cn } from "@/lib/utils";

const fr = { moduleFrame };

/**
 * The viewer's « À vous » count (proto « Projet complet », `.mine`): a round
 * pill in the selection blue, 18 px, after a label (a sub-module's pill, an
 * entry of the project's navigation, a mobile chip). Computed by the server
 * from the journeys (lib/journey/), never stored. Its accessible name says
 * « n à vous ». Nothing when the count is 0.
 */
export function MineBadge({
  count,
  className,
}: {
  count: number;
  // Placement only (`ml-auto`), never a restyle.
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      role="img"
      aria-label={fr.moduleFrame.mine(count)}
      className={cn(
        "grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-[var(--selection)] px-1 text-[length:var(--type-micro)] leading-none font-bold text-[color:var(--text-on-dark)] tabular-nums",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

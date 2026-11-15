import { participationWaivers } from "@/lib/i18n/fr/participation-waivers";
import {
  waiverState,
  type ParticipationWaiver,
} from "@/lib/projects/title-board-rules";
import { formatShortDate } from "@/lib/release/format";
import { cn } from "@/lib/utils";

const fr = { participationWaivers };
const t = fr.participationWaivers;

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

/**
 * A participation's waivers that still say something (lot 12): an open one
 * (« Dérogation de tournage jusqu'au 30 nov. 2026 »), a lapsed one (« échue
 * le … »). Revoked ones live in the Activité. Nothing when there is none.
 */
export function WaiverLines({
  waivers,
  today,
  className,
}: {
  waivers: ParticipationWaiver[];
  today: string;
  className?: string;
}) {
  const shown = waivers.filter((w) => waiverState(w, today) !== "revoked");
  if (shown.length === 0) return null;
  return (
    <span className={cn("flex flex-col gap-0.5", className)}>
      {shown.map((w) => {
        const open = waiverState(w, today) === "open";
        return (
          <span
            key={w.id}
            className={cn(
              caption,
              open
                ? "text-[color:var(--text-secondary)]"
                : "text-[color:var(--text-tertiary)]",
            )}
          >
            {open
              ? t.line.open(t.scopeOf[w.scope], formatShortDate(w.dueOn))
              : t.line.lapsed(t.scopeOf[w.scope], formatShortDate(w.dueOn))}
          </span>
        );
      })}
    </span>
  );
}

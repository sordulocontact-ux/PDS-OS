import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { FollowUpGroup } from "@/lib/strategy/follow-up";
import { followUpTone } from "@/lib/ui/state-tones";

/**
 * What PO watches before the release (ticket § 14): contents, influence,
 * RP, playlisting, coordination and validations, each Prêt, En cours, En
 * attente or Bloqué with the reason the code found
 * (lib/strategy/follow-up.ts).
 */
export function FollowUpGroups({ groups }: { groups: FollowUpGroup[] }) {
  const t = fr.strategyFollowUp;
  if (groups.length === 0)
    return (
      <p className="text-body-md text-muted-foreground">{t.before.empty}</p>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <section
          key={group.area}
          aria-labelledby={`follow-${group.area}`}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5"
        >
          <h3
            id={`follow-${group.area}`}
            className="text-body-md font-semibold"
          >
            {t.areas[group.area]}
          </h3>
          <ul className="flex flex-col gap-3">
            {group.items.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold break-words">
                    {item.label}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {item.reason}
                  </span>
                </span>
                <StatusBadge tone={followUpTone[item.state]} size="sm">
                  {t.states[item.state]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

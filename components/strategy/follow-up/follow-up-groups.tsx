import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { FollowGroup } from "@/lib/strategy/follow-up";
import { followUpTone } from "@/lib/ui/state-tones";

/**
 * What PO watches before the release (ticket § 14): contents, levers,
 * coordination and validations, each Prêt, En cours, En attente or Bloqué
 * (computed by code, lib/strategy/follow-up.ts).
 */
export function FollowUpGroups({ groups }: { groups: FollowGroup[] }) {
  const t = fr.strategyDocs.followUp;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section
            key={group.key}
            aria-labelledby={`follow-${group.key}`}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5"
          >
            <h3
              id={`follow-${group.key}`}
              className="text-body-md font-semibold"
            >
              {t.groups[group.key]}
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
                      {item.line}
                    </span>
                  </span>
                  <StatusBadge tone={followUpTone[item.state]} size="sm">
                    {t.states[item.state]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}

import { StrategyPart } from "@/components/strategy/strategy-part";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import type { FollowUpGroup } from "@/lib/strategy/follow-up";
import { followUpTone } from "@/lib/ui/state-tones";

const fr = { strategyFollowUp };

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
    <div className="grid gap-5 xl:grid-cols-2">
      {groups.map((group) => (
        <StrategyPart
          key={group.area}
          id={`follow-${group.area}`}
          title={t.areas[group.area]}
        >
          <Rows label={t.areas[group.area]}>
            {group.items.map((item) => (
              <InfoRow
                key={item.key}
                title={item.label}
                detail={item.reason}
                badge={
                  <StatusBadge tone={followUpTone[item.state]} size="sm">
                    {t.states[item.state]}
                  </StatusBadge>
                }
              />
            ))}
          </Rows>
        </StrategyPart>
      ))}
    </div>
  );
}

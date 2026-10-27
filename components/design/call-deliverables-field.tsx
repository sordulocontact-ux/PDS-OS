"use client";

import { FilterChip } from "@/components/ui/filter-chip";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DesignCallDeliverable } from "@/lib/design/call-prep";
import { conception } from "@/lib/i18n/fr/conception";
import { conceptionCall } from "@/lib/i18n/fr/conception-call";
import { conceptionDeliverableTone } from "@/lib/ui/state-tones";

const fr = { conception, conceptionCall };

/**
 * The deliverables a creative exchange is about, one pill each; a
 * deliverable still to qualify says so. The agenda follows the choice.
 */
export function CallDeliverablesField({
  id,
  deliverables,
  selected,
  onToggle,
}: {
  // Heading id, for aria-labelledby.
  id: string;
  deliverables: DesignCallDeliverable[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const t = fr.conceptionCall;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-sm font-medium">
          {t.deliverables}
        </h3>
        <p className="text-caption text-muted-foreground">
          {deliverables.length ? t.deliverablesHint : t.noDeliverables}
        </p>
      </div>
      {deliverables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deliverables.map((d) => (
            <FilterChip
              key={d.id}
              variant="soft"
              pressed={selected.has(d.id)}
              onClick={() => onToggle(d.id)}
            >
              {d.title}
              {d.status === "to_qualify" && (
                <StatusBadge
                  tone={conceptionDeliverableTone.to_qualify}
                  size="sm"
                >
                  {fr.conception.statuses.to_qualify}
                </StatusBadge>
              )}
            </FilterChip>
          ))}
        </div>
      )}
    </section>
  );
}

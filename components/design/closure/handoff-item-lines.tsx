import type { HandoffItem } from "@/lib/design/handoff-plan";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";

/** What goes with a deliverable to Production, or why it stays. */
export function HandoffItemLines({ item: i }: { item: HandoffItem }) {
  const t = fr.conceptionClosure;
  const facts =
    i.state === "not_ready"
      ? [
          i.sheetStatus
            ? t.notReady(fr.conception.sheetStatuses[i.sheetStatus])
            : t.noSheet,
        ]
      : [
          i.version ? t.version(i.version) : null,
          i.responsible ? t.responsible(i.responsible) : null,
          i.deliveryDate ? t.delivery(formatBriefDate(i.deliveryDate)) : null,
        ].filter((x): x is string => Boolean(x));
  return (
    <div className="flex flex-col gap-0.5 pl-8 text-caption text-muted-foreground">
      {facts.length > 0 && <span>{facts.join(" · ")}</span>}
      {i.dependencies && <span>{t.dependencies(i.dependencies)}</span>}
      {i.reserves.map((r) => (
        <span key={r}>{t.reserveLine(r)}</span>
      ))}
      {i.state === "excluded" && i.exclusionReason && (
        <span>{t.excludedBecause(i.exclusionReason)}</span>
      )}
    </div>
  );
}

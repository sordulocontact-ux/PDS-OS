import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { HandoffRecord } from "@/lib/production/delivery/queries";
import type { HandoffStaleness } from "@/lib/production/delivery/rules";
import { formatDate } from "@/lib/release/format";
import { activationHandoffTone } from "@/lib/ui/state-tones";

import { HandoffExports } from "./handoff-exports";

const t = fr.productionDelivery.handoff;
const c = fr.productionClosure.handoff;

/**
 * One transmission to Activations: the delivered version referenced (never
 * copied), the formats, the delivery date, the constraints, who and when.
 * A transmission the delivery has overtaken says so: an activation may
 * point to an earlier version. `deliverable`: its title and the way to its
 * delivery, on the Activations page.
 */
export function HandoffItem({
  handoff: h,
  staleness,
  earlier = false,
  deliverable,
}: {
  handoff: HandoffRecord;
  staleness: HandoffStaleness | null;
  // Replaced by a later transmission of the same deliverable.
  earlier?: boolean;
  deliverable?: { title: string; href: string };
}) {
  const state = earlier ? "earlier" : staleness ? "stale" : "current";
  const version =
    h.versionNumber !== null ? t.versionValue(h.versionNumber) : null;
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {deliverable && (
            <h3 className="font-medium break-words">
              <ViewLink
                href={deliverable.href}
                className="underline-offset-4 hover:underline"
              >
                {deliverable.title}
              </ViewLink>
            </h3>
          )}
          <p className="text-sm text-muted-foreground">
            {t.summary(version, formatDate(h.deliveredAt))}
            {h.finalUrl && (
              <>
                {" · "}
                <a
                  href={h.finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {t.finalLink}
                </a>
              </>
            )}
          </p>
        </div>
        <StatusBadge size="sm" tone={activationHandoffTone[state]}>
          {t.states[state]}
        </StatusBadge>
      </div>
      <p className="text-sm">
        <span className="text-muted-foreground">{t.formats} · </span>
        {h.formats.length > 0 ? h.formats.join(", ") : "—"}
      </p>
      {h.constraints && (
        <p className="text-sm break-words">
          <span className="text-muted-foreground">{t.constraints} · </span>
          {h.constraints}
        </p>
      )}
      {h.exports.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{c.exports}</p>
          <HandoffExports exports={h.exports} />
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {t.by(h.confirmedBy ?? "—", formatDate(h.confirmedAt))}
        {h.recipient && ` · ${c.sentTo(h.recipient)}`}
      </p>
      {!earlier && staleness && (
        <ToneCallout tone={activationHandoffTone.stale}>
          {t.stale[staleness]} {t.stale.warning}
        </ToneCallout>
      )}
    </li>
  );
}

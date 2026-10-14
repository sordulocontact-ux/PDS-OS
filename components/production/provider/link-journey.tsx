import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatDate } from "@/lib/release/format";

import { LinkDirectionForm } from "./link-direction-form";
import { LinkGearForm } from "./link-gear-form";
import { LinkPlaceForm } from "./link-place-form";
import { LinkProgress } from "./link-progress";
import { LinkQuoteForm } from "./link-quote-form";
import { ProviderSection } from "./provider-section";

const t = fr.productionLink;
const QUOTE_TONE = {
  deposited: "warning",
  submitted: "action",
  approved: "success",
  rejected: "danger",
} as const;

/**
 * The provider's part of the journey on its link (Ibé, 14/10): only what its
 * role does — the company's quote, progress and places, the director's
 * proposal, the director of photography's gear list — and the actions given
 * to it after a call.
 */
export function LinkJourneyView({
  token,
  journey: j,
}: {
  token: string;
  journey: LinkJourney;
}) {
  const company = j.roles.includes("company");
  const director = j.roles.includes("director");
  const dop = j.roles.includes("dop");
  const latest = j.quotes[0] ?? null;
  const canDeposit = !latest || latest.status === "rejected";
  const d = j.direction;
  return (
    <div className="flex flex-col gap-6">
      {j.actions.length > 0 && (
        <ProviderSection title={t.tasks.title}>
          <ul className="flex flex-col gap-2">
            {j.actions.map((a) => (
              <li
                key={a.title}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1">{a.title}</span>
                {a.dueDate && (
                  <span className="text-muted-foreground">
                    {t.tasks.due(formatDate(a.dueDate))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </ProviderSection>
      )}
      {director && (
        <ProviderSection
          title={t.direction.title}
          hint={t.direction.description}
        >
          <div className="flex items-center gap-2">
            <StatusBadge
              size="sm"
              tone={
                d.status === "approved"
                  ? "success"
                  : d.status === "changes"
                    ? "warning"
                    : d.status === "submitted"
                      ? "action"
                      : "neutral"
              }
            >
              {t.direction.status[d.status]}
            </StatusBadge>
          </div>
          {d.status === "changes" && d.comment && (
            <ToneCallout tone="warning">
              {t.direction.changes(d.comment)}
            </ToneCallout>
          )}
          {d.status !== "approved" && d.status !== "submitted" && (
            <LinkDirectionForm
              token={token}
              current={{
                stagingIntent: d.stagingIntent,
                runOfShow: d.runOfShow,
                references: d.references,
              }}
            />
          )}
        </ProviderSection>
      )}
      {company && (
        <>
          <ProviderSection
            title={t.quote.title}
            hint={[
              t.quote.description,
              t.quote.frame(
                j.envelopeCents !== null ? formatEuros(j.envelopeCents) : null,
                j.deliveryOn ? formatDate(j.deliveryOn) : null,
              ),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {j.quotes.length > 0 && (
              <ul className="flex flex-col gap-2">
                {j.quotes.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-col gap-1 rounded-lg border border-[color:var(--border-hairline)] px-3 py-2.5 text-sm"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <b>{q.label}</b>
                      <StatusBadge size="sm" tone={QUOTE_TONE[q.status]}>
                        {t.quote.status[q.status]}
                      </StatusBadge>
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatEuros(q.amountCents)}
                      {q.deliveryOn && ` · ${formatDate(q.deliveryOn)}`}
                    </span>
                    {q.status === "rejected" && q.reason && (
                      <span>{t.quote.reason(q.reason)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canDeposit && (
              <LinkQuoteForm
                token={token}
                redo={latest?.status === "rejected"}
              />
            )}
          </ProviderSection>
          {j.organization === "external" && (
            <ProviderSection
              title={t.progress.title}
              hint={t.progress.description}
            >
              <LinkProgress token={token} progress={j.progress} />
            </ProviderSection>
          )}
          <ProviderSection title={t.places.title} hint={t.places.description}>
            {j.locations.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{t.places.proposed}</h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {j.locations.map((l) => (
                    <li
                      key={l.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{l.name}</span>
                      <StatusBadge
                        size="sm"
                        tone={l.status === "chosen" ? "success" : "neutral"}
                      >
                        {l.status === "chosen"
                          ? t.places.status.chosen
                          : t.places.status.candidate}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <LinkPlaceForm token={token} />
          </ProviderSection>
        </>
      )}
      {dop && (
        <ProviderSection title={t.gear.title} hint={t.gear.description}>
          {j.gearCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t.gear.count(j.gearCount)}
            </p>
          )}
          <LinkGearForm token={token} />
        </ProviderSection>
      )}
    </div>
  );
}

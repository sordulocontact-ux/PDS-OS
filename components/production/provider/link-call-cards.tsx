import { CallFacts } from "@/components/calls/call-facts";
import { MeetingSummaryFor } from "@/components/calls/meeting/meeting-summary-for";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { StatusBadge } from "@/components/ui/status-badge";
import { callWhen, shortDay, shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatDate } from "@/lib/release/format";

const t = fr.productionLink.call;

/**
 * The production calls on the company's link (proto portal): before it is
 * held, « Votre prochain rendez-vous avec PDS » — when, where, who, the
 * agenda, who invited; once held, « Call de production du … » with the
 * summary sent to the company and what PDS confirmed was asked of it.
 * Never the report itself.
 */
export function linkCallCards(j: LinkJourney): PortalCardItem[] {
  const held = j.calls.filter((c) => c.status === "ready");
  const planned = j.calls.filter((c) => c.status !== "ready");
  const cards: PortalCardItem[] = planned.map((c, i) => ({
    id: `ps-call-${i}`,
    title: t.next,
    state: "waiting",
    order: 5,
    body: (
      <>
        <span className="flex flex-wrap items-center gap-2">
          <b className="font-semibold">{c.title}</b>
          <StatusBadge size="sm" tone="info">
            {t.invited}
          </StatusBadge>
        </span>
        <CallFacts
          facts={[
            { label: t.when, value: callWhen(c.occurredAt) },
            ...(c.meetingUrl || c.format
              ? [
                  {
                    label: t.where,
                    value: [
                      c.meetingUrl,
                      c.format === "in_person" ? t.onSite : t.video,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  },
                ]
              : []),
            {
              label: t.participants,
              value: c.participants.filter(Boolean).join(" · "),
            },
            {
              label: t.agenda,
              value: c.agenda
                .filter(Boolean)
                .map((topic, n) => `${n + 1}. ${topic}`)
                .join(" · "),
            },
          ]}
        />
        {c.invitedBy && (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.invitedBy(c.invitedBy, shortStamp(c.invitedAt))}
          </p>
        )}
      </>
    ),
  }));
  const last = held.at(-1);
  if (last)
    cards.push({
      id: "ps-call-held",
      title: t.held(shortDay(last.occurredAt)),
      state: j.actions.length > 0 ? "todo" : "waiting",
      order: 6,
      action:
        j.actions.length > 0
          ? {
              label: j.actions[0].title,
              due: j.actions[0].dueDate
                ? formatDate(j.actions[0].dueDate)
                : null,
            }
          : null,
      dueKey: j.actions[0]?.dueDate ?? null,
      body: (
        <>
          <MeetingSummaryFor
            summary={last.summary && { ...last.summary, count: 0 }}
          />
          {j.actions.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold">{t.asked}</h3>
              <ul className="flex flex-col gap-2">
                {j.actions.map((a) => (
                  <li
                    key={a.title}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>
                        {a.title}
                        {a.dueDate &&
                          ` · ${fr.productionLink.tasks.due(formatDate(a.dueDate)).toLowerCase()}`}
                      </span>
                      <span className="text-caption text-[color:var(--text-tertiary)]">
                        {t.confirmed}
                      </span>
                    </span>
                    <StatusBadge size="sm" tone="neutral">
                      {t.todo}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-muted-foreground">{t.nothingYet}</p>
          )}
        </>
      ),
    });
  return cards;
}

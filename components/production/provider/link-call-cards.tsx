import { CallFacts } from "@/components/calls/call-facts";
import { MeetingSummaryFor } from "@/components/calls/meeting/meeting-summary-for";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { StatusBadge } from "@/components/ui/status-badge";
import { callWhen, shortDay, shortStamp } from "@/lib/calls/prep/dates";
import { productionLink } from "@/lib/i18n/fr/production-link";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatShortDay } from "@/lib/utils/day";

import { LinkTaskList } from "./link-task-cards";

const fr = { productionLink };

const t = fr.productionLink.call;

/**
 * The production calls on the company's link (proto portal): before it is
 * held, « Votre prochain rendez-vous avec PDS » — when, where, who, the
 * agenda, who invited; once held, « Call de production du … » with the
 * summary sent to the company and what PDS confirmed was asked of it.
 * Never the report itself.
 */
export function linkCallCards(token: string, j: LinkJourney): PortalCardItem[] {
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
  const asked = j.actions.filter((a) => !a.checklist && a.origin === null);
  const open = asked.filter((a) => a.doneAt === null);
  if (last)
    cards.push({
      id: "ps-call-held",
      title: t.held(shortDay(last.occurredAt)),
      state: open.length > 0 ? "todo" : "waiting",
      order: 6,
      action:
        open.length > 0
          ? {
              label: open[0].title,
              due: open[0].dueDate
                ? formatShortDay(open[0].dueDate, { bare: true })
                : null,
            }
          : null,
      dueKey: open[0]?.dueDate ?? null,
      body: (
        <>
          <MeetingSummaryFor
            summary={last.summary && { ...last.summary, count: 0 }}
          />
          {asked.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold">{t.asked}</h3>
              <LinkTaskList
                token={token}
                actions={asked}
                origin={t.confirmed}
              />
            </section>
          ) : (
            <p className="text-muted-foreground">{t.nothingYet}</p>
          )}
        </>
      ),
    });
  return cards;
}

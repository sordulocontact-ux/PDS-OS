import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import type { ContactCallDetail, ContactItem } from "@/lib/portal/contact-page";
import { formatDay, formatShortDay, formatShortInstant } from "@/lib/utils/day";
import { formatHour } from "@/lib/utils/instant";

import type { PortalCardItem } from "./portal-sections";

const t = fr.portal.call;

const Source = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[length:var(--type-micro)] text-[color:var(--text-tertiary)]">
    {children}
  </span>
);

/**
 * A call on the person's page (proto portalCalls): before it, the
 * invitation (Quand, Où, Participants, Ordre du jour) with its pill
 * « Invité »; after it, the summary they received, or « PDS confirme les
 * suites du call ». Read only: the call's owner holds it in the app.
 */
export function callPortalCard(
  item: ContactItem,
  detail: ContactCallDetail,
  order: number,
): PortalCardItem {
  const upcoming = item.state === "todo";
  return {
    id: "ps-call",
    title: upcoming
      ? detail.title
      : t.held(detail.title, formatShortDay(detail.occurredAt, { bare: true })),
    state: item.state,
    invite: upcoming,
    badge: upcoming ? t.invited : undefined,
    dueKey: item.due,
    order,
    workflow: item.workflow,
    body: upcoming ? <Invitation detail={detail} /> : <Held detail={detail} />,
  };
}

function Invitation({ detail: d }: { detail: ContactCallDetail }) {
  return (
    <>
      <FactRows>
        <FactRow
          label={t.when}
          value={t.whenValue(formatDay(d.occurredAt), formatHour(d.occurredAt))}
        />
        <FactRow
          label={t.where}
          value={
            d.meetingUrl ? (
              <span>
                <a
                  href={d.meetingUrl}
                  className="break-all underline underline-offset-2"
                  rel="noreferrer"
                  target="_blank"
                >
                  {d.meetingUrl}
                </a>{" "}
                <Source>· {t.visio}</Source>
              </span>
            ) : (
              t.atPds
            )
          }
        />
        {d.participants.length > 0 && (
          <FactRow label={t.participants} value={d.participants.join(" · ")} />
        )}
        {d.agenda.length > 0 && (
          <FactRow
            label={t.agenda}
            value={d.agenda.map((x, i) => `${i + 1}. ${x}`).join(" · ")}
          />
        )}
      </FactRows>
      <Source>{t.invitedBy(d.invitedBy, formatShortDay(d.invitedAt))}</Source>
    </>
  );
}

function Held({ detail: d }: { detail: ContactCallDetail }) {
  if (!d.summary) return <p className="text-muted-foreground">{t.pending}</p>;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-semibold">{t.summary}</h3>
      <p className="whitespace-pre-line text-muted-foreground">
        {d.summary.text}
      </p>
      <Source>
        {t.summaryBy(
          d.summary.by,
          formatShortInstant(d.summary.sentAt),
          d.summary.version,
        )}
      </Source>
    </div>
  );
}

import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type {
  ContactCallDetail,
  ContactCallRequests,
  ContactItem,
} from "@/lib/portal/contact-page";
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
 * « Invité »; after it, the summary they received, then « Ce qui vous a été
 * demandé » — what PDS confirmed after the call, each « À faire » or
 * « Fait » —, or « PDS confirme les suites du call » until then. Never the
 * report (rule 21). Read only: the call's owner holds it in the app.
 */
export function callPortalCard(
  item: ContactItem,
  detail: ContactCallDetail,
  order: number,
  requests: ContactCallRequests | null,
): PortalCardItem {
  const upcoming = item.state === "todo";
  const settled = requests?.settled ?? Boolean(detail.summary);
  const asked = requests?.asked ?? [];
  const open = asked.filter((a) => a.doneAt === null);
  const state = upcoming
    ? "todo"
    : !settled
      ? "waiting"
      : open.length > 0
        ? "todo"
        : "done";
  return {
    id: "ps-call",
    title: upcoming
      ? detail.title
      : t.held(detail.title, formatShortDay(detail.occurredAt, { bare: true })),
    state,
    invite: upcoming,
    badge: upcoming ? t.invited : undefined,
    action:
      !upcoming && open.length > 0
        ? {
            label: open[0].title,
            due: open[0].due
              ? formatShortDay(open[0].due, { bare: true })
              : null,
          }
        : null,
    dueKey: upcoming ? item.due : (open[0]?.due ?? null),
    order,
    workflow: item.workflow,
    body: upcoming ? (
      <Invitation detail={detail} />
    ) : (
      <Held detail={detail} settled={settled} asked={asked} />
    ),
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

function Held({
  detail: d,
  settled,
  asked,
}: {
  detail: ContactCallDetail;
  settled: boolean;
  asked: ContactCallRequests["asked"];
}) {
  return (
    <>
      {d.summary && (
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
      )}
      {!settled ? (
        <p className="text-muted-foreground">{t.pending}</p>
      ) : asked.length > 0 ? (
        <Asked asked={asked} />
      ) : (
        <p className="text-muted-foreground">{t.nothingAsked}</p>
      )}
    </>
  );
}

/** « Ce qui vous a été demandé »: each action with its date, « À faire »
 * or « Fait ». */
function Asked({ asked }: { asked: ContactCallRequests["asked"] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{t.asked}</h3>
      <ul className="flex flex-col">
        {asked.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-3 border-t border-[color:var(--border-hairline)] py-2.5 first:border-t-0"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>
                <b className="font-semibold">{a.title}</b>
                {a.due &&
                  ` · ${t.dueFor(formatShortDay(a.due, { bare: true }))}`}
              </span>
              <Source>
                {a.doneAt ? t.doneOn(formatShortDay(a.doneAt)) : t.confirmed}
              </Source>
            </span>
            <StatusBadge size="sm" tone={a.doneAt ? "success" : "info"}>
              {a.doneAt ? t.done : t.todo}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </section>
  );
}

import type { PortalCardItem } from "@/components/portal/portal-sections";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatDate } from "@/lib/release/format";

import { LinkDirectionForm } from "./link-direction-form";
import { LinkGearForm } from "./link-gear-form";
import { LinkPlaceForm } from "./link-place-form";
import { LinkProgress } from "./link-progress";
import { LinkQuoteForm } from "./link-quote-form";
import { LinkQuoteList } from "./link-quote-list";

const t = fr.productionLink;
const p = fr.portal.provider;

/**
 * The provider's part of the journey on its link (Ibé, 14/10), as the cards
 * of its private page (C13 A, `PortalSections`): only what its role does —
 * the company's quote, progress and places, the director's proposal, the
 * director of photography's gear list — and the actions given to it after
 * a call; each card says whether it is « À vous », « En attente de PDS »
 * or « Fait ».
 */
export function linkJourneyCards({
  token,
  journey: j,
}: {
  token: string;
  journey: LinkJourney;
}): PortalCardItem[] {
  const company = j.roles.includes("company");
  const director = j.roles.includes("director");
  const dop = j.roles.includes("dop");
  const latest = j.quotes[0] ?? null;
  const canDeposit = !latest || latest.status === "rejected";
  const d = j.direction;
  const hint = (text: string) => (
    <p className="text-pretty text-muted-foreground">{text}</p>
  );
  const cards: PortalCardItem[] = [];
  if (j.actions.length > 0)
    cards.push({
      id: "ps-tasks",
      title: t.tasks.title,
      state: "todo",
      order: 90,
      action: {
        label: j.actions[0].title,
        due: j.actions[0].dueDate ? formatDate(j.actions[0].dueDate) : null,
      },
      dueKey: j.actions[0].dueDate,
      body: (
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
      ),
    });
  if (director)
    cards.push({
      id: "ps-direction",
      title: t.direction.title,
      state:
        d.status === "approved"
          ? "done"
          : d.status === "submitted"
            ? "waiting"
            : "todo",
      order: 20,
      action: { label: p.direction },
      body: (
        <>
          {hint(t.direction.description)}
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
        </>
      ),
    });
  if (company) {
    const frame = t.quote.frame(j.deliveryOn ? formatDate(j.deliveryOn) : null);
    cards.push({
      id: "ps-quote",
      title: t.quote.title,
      state: canDeposit
        ? "todo"
        : latest?.status === "approved"
          ? "done"
          : "waiting",
      order: 10,
      action: { label: p.quote },
      body: (
        <>
          {hint([t.quote.description, frame].filter(Boolean).join(" "))}
          <LinkQuoteList quotes={j.quotes} />
          {canDeposit && (
            <LinkQuoteForm token={token} redo={latest?.status === "rejected"} />
          )}
        </>
      ),
    });
    if (j.organization === "external")
      cards.push({
        id: "ps-progress",
        title: t.progress.title,
        state:
          Object.values(j.progress).some((v) => !v) ||
          Object.keys(j.progress).length === 0
            ? "todo"
            : "done",
        order: 30,
        action: { label: p.progress },
        body: (
          <>
            {hint(t.progress.description)}
            <LinkProgress token={token} progress={j.progress} />
          </>
        ),
      });
    cards.push({
      id: "ps-places",
      title: t.places.title,
      state: j.locations.some((l) => l.status === "chosen")
        ? "done"
        : "waiting",
      order: 40,
      body: (
        <>
          {hint(t.places.description)}
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
        </>
      ),
    });
  }
  if (dop)
    cards.push({
      id: "ps-gear",
      title: t.gear.title,
      state: j.gearCount > 0 ? "done" : "todo",
      order: 50,
      action: { label: p.gear },
      body: (
        <>
          {hint(t.gear.description)}
          {j.gearCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t.gear.count(j.gearCount)}
            </p>
          )}
          <LinkGearForm token={token} />
        </>
      ),
    });
  return cards;
}

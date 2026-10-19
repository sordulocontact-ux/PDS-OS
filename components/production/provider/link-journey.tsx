import type { PortalCardItem } from "@/components/portal/portal-sections";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";

import { linkCallCards } from "./link-call-cards";
import { linkDirectorCard } from "./link-director-card";
import { LinkDirectionForm } from "./link-direction-form";
import { LinkGearForm } from "./link-gear-form";
import { LinkPlaceForm } from "./link-place-form";
import { linkQuoteCard } from "./link-quote-card";
import { linkChecklistCard, LinkTaskList } from "./link-task-cards";

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
  provider,
}: {
  token: string;
  journey: LinkJourney;
  // The contact's own name (« Proposé par Studio Ressac »).
  provider: string;
}): PortalCardItem[] {
  const company = j.roles.includes("company");
  const director = j.roles.includes("director");
  const dop = j.roles.includes("dop");
  const d = j.direction;
  const hint = (text: string) => (
    <p className="text-pretty text-muted-foreground">{text}</p>
  );
  const cards: PortalCardItem[] = linkCallCards(token, j);
  const directorCard = linkDirectorCard(token, j, provider);
  if (directorCard) cards.push(directorCard);
  // Without a call held, the actions given stand on their own card.
  const asked = j.actions.filter((a) => !a.checklist && a.origin === null);
  if (asked.length > 0 && !j.calls.some((c) => c.status === "ready"))
    cards.push({
      id: "ps-tasks",
      title: t.tasks.title,
      state: asked.some((a) => a.doneAt === null) ? "todo" : "done",
      order: 90,
      action: { label: asked[0].title, due: asked[0].dueDate },
      dueKey: asked[0].dueDate,
      body: (
        <LinkTaskList
          token={token}
          actions={asked}
          origin={fr.productionLink.call.confirmed}
        />
      ),
    });
  const checklist = linkChecklistCard(token, j);
  if (checklist) cards.push(checklist);
  // The preparation confirmed by PDS (proto: the same sentence as in PDS).
  if (company && j.readyAt)
    cards.push({
      id: "ps-ready",
      title: fr.productionReady.link.title,
      state: "done",
      order: 50,
      body: <p>{fr.productionReady.link.done}</p>,
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
    cards.push(linkQuoteCard(token, j, provider));
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

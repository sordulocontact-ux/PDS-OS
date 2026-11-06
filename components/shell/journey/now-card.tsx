import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TitleBlock } from "@/components/ui/title-block";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { journey } from "@/lib/i18n/fr/journey";
import {
  actionHref,
  lowerFirst,
  type JourneyStep,
  nowOf,
} from "@/lib/ui/journey";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";

import { WaitingRows } from "./now-waiting";

const fr = { journey };

const t = fr.journey.now;

/** An action with where it is (« Marketing › Production › Pochette »). */
export type NowItem = { step: JourneyStep; place?: string };

export type NowCardProps = {
  // The module's journey (variant « module ») or nothing (« overview »).
  steps: JourneyStep[];
  viewerName: string | null;
  // The module's name in the eyebrow (« Marketing › Les 8 dimensions »).
  moduleLabel?: string;
  // The step shown below: never repeated (VISION-UX § 4).
  shownKey?: string;
  // The viewer's actions in other modules (loadProjectJourneys, elsewhereOf)
  // — or, in the overview, all of them.
  elsewhere?: NowItem[];
  // What others are expected to do elsewhere (the overview's list).
  waitingElsewhere?: NowItem[];
  // Blockers the viewer has to lift (C6): title and where.
  blockers?: Array<{ key: string; title: string; href: string }>;
  // Per module: « Le Master avance sans vous… », « Le master final est au
  // Catalogue ».
  labels?: { waitingTitle: string; finished: string };
  variant?: "module" | "overview";
  // Module variant: where « N choses à faire ailleurs » leads (the project's
  // Travail).
  workHref?: string;
};

/**
 * « Maintenant » (docs/VISION-UX.md § 4, proto « Projet complet »), one
 * logic for every module and the overview: « À vous » (the action, its why,
 * « Ouvrir l'étape »), « Aussi à vous » when the step shown is already the
 * viewer's, « À vous, ailleurs » when only another module waits for them,
 * else « Rien à faire pour vous » and who is expected; blockers to lift, the
 * due date in the eyebrow. It disappears when the only action of the viewer
 * is the step shown. Computed by code for the person looking.
 */
export function NowCard({
  steps,
  viewerName,
  moduleLabel,
  shownKey,
  elsewhere = [],
  waitingElsewhere = [],
  blockers = [],
  labels,
  variant = "module",
  workHref,
}: NowCardProps) {
  const overview = variant === "overview";
  const all = nowOf(steps);
  const here = all.mine.filter((s) => s.key !== shownKey);
  const also = here.length < all.mine.length;
  // A module's card shows this module's gesture only; the rest is a line.
  const mine: NowItem[] = [
    ...here.map((step) => ({ step, place: moduleLabel })),
    ...(overview ? elsewhere : []),
  ];
  if (!overview && mine.length === 0 && blockers.length === 0) {
    if (elsewhere.length > 0)
      return (
        <ElsewhereLine
          count={elsewhere.length}
          href={workHref}
          // The step shown is the viewer's: never « Rien à faire ici ».
          also={also}
        />
      );
    if (also) return null;
  }
  const waiting: NowItem[] = [
    ...all.waiting.map((step) => ({ step, place: moduleLabel })),
    ...waitingElsewhere,
  ];
  if (overview && also && mine.length === 0 && blockers.length === 0)
    return null;
  const [first, ...more] = mine;
  const badge = first
    ? {
        tone: "info" as const,
        label: also ? t.alsoMine : t.mine,
      }
    : blockers.length > 0
      ? { tone: "danger" as const, label: t.blocker }
      : { tone: "neutral" as const, label: t.nothing };
  const texts = labels ?? {
    waitingTitle: t.waitingTitle,
    finished: t.finished,
  };
  const eyebrow = first
    ? [
        viewerName,
        [first.place, first.step.title].filter(Boolean).join(" › "),
        first.step.due
          ? t.due(formatShortDay(first.step.due, { bare: true }))
          : null,
      ]
    : [viewerName];
  return (
    <NowFrame label={t.label}>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        <span>{eyebrow.filter(Boolean).join(" · ")}</span>
      </div>
      <TitleBlock>
        <h2
          className={cn(
            "font-medium tracking-[var(--type-display-tracking)] text-balance",
            overview
              ? "text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)]"
              : "text-[length:var(--type-figure-lg)] leading-[var(--type-figure-lg-lh)]",
          )}
        >
          {first
            ? first.step.actor?.todo
            : overview
              ? t.allDone
              : waiting.length > 0
                ? texts.waitingTitle
                : texts.finished}
        </h2>
        {first?.step.why && !overview && (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {first.step.why}
          </p>
        )}
        {!first && overview && (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {t.othersMove}
          </p>
        )}
      </TitleBlock>
      {first && (
        <div className="flex flex-wrap items-center gap-3">
          <ViewLink href={actionHref(first.step)} className={buttonVariants()}>
            <ButtonRoll>{overview ? t.openShort : t.open}</ButtonRoll>
          </ViewLink>
          {overview && more.length > 0 && (
            <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
              {t.others(
                more.length,
                // The overview names two, then counts (proto).
                (overview ? more.slice(0, 2) : more)
                  .map(
                    (m) =>
                      `${lowerFirst(m.step.actor?.todo ?? "")} (${
                        overview || m.place !== moduleLabel
                          ? (m.place ?? m.step.title)
                          : m.step.title
                      })`,
                  )
                  .join(" · "),
              )}
            </span>
          )}
        </div>
      )}
      {blockers.length > 0 && (
        <ToneCallout tone="danger">
          {t.blockers(
            blockers.length,
            blockers.map((b) => b.title).join(" · "),
          )}
        </ToneCallout>
      )}
      {!overview && waiting.length > 0 && (
        <WaitingRows items={waiting.slice(0, first ? 2 : 3)} />
      )}
    </NowFrame>
  );
}

/** A module with nothing else for the viewer: one quiet line, not the big
 * card (« Rien à faire ici », or only the count when the step shown is
 * theirs). */
function ElsewhereLine({
  count,
  href,
  also,
}: {
  count: number;
  href?: string;
  also: boolean;
}) {
  return (
    <p
      data-now-card
      className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]"
    >
      {also ? t.alsoElsewhere(count) : t.nothingHere(count)}{" "}
      {href && (
        <ViewLink
          href={href}
          className="font-medium text-[color:var(--text-primary)] underline underline-offset-2"
        >
          {t.seeWork}
        </ViewLink>
      )}
    </p>
  );
}

/** The frame of « Maintenant »: the hairline of the other cards, no
 * shadow (Sacha, 30/10/2026): NowCard in a module, the lead of the Travail. */
export function NowFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      data-now-card
      className="flex flex-col gap-3.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5"
    >
      {children}
    </section>
  );
}

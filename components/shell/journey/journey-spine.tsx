"use client";

import {
  IconLock,
  IconTriangleWarning,
  IconXmark,
} from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { IconStop } from "@/components/icons";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { ViewLink } from "@/components/ui/view-link";
import { journey } from "@/lib/i18n/fr/journey";
import {
  isLocked,
  type JourneyStep,
  lowerFirst,
  prereqsOf,
  withModule,
} from "@/lib/ui/journey";
import { cn } from "@/lib/utils";

const fr = { journey };

const t = fr.journey;

/**
 * The journey on the left of a module (docs/VISION-UX.md § 4, proto
 * « Projet complet »): each step, its state, who acts on it or what it gave,
 * the viewer's own steps marked « À vous ». States: done (green check),
 * current (blue dot; full blue when it is the viewer's, also when the step
 * waits for the viewer), waiting and rework (warning), locked (dashed,
 * lock, « Après : … »), obsolete (struck through); a reported blocker adds
 * a stop icon, an alert a red subtitle (warning for a decision awaited,
 * which is not an error). Steps with a
 * `group` sit under its intertitle. The open step is the page shown on the
 * right (`openKey`, else the one whose URL is the current path). Titled
 * « Parcours » alone: the trail already names the module (Sacha,
 * 10/11/2026). Full height beside the step from 900 px (JourneyLayout),
 * kept in view while the step scrolls. `footer`: links at its foot (the
 * module's history; the Distribution adds its anomalies). A step done with
 * `reserve` has a warning mark, never green.
 */
export function JourneySpine({
  steps,
  openKey,
  footer,
}: {
  steps: JourneyStep[];
  openKey?: string;
  footer?:
    { href: string; label: string } | Array<{ href: string; label: string }>;
}) {
  const links = footer ? (Array.isArray(footer) ? footer : [footer]) : [];
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.label}
      className="flex flex-col gap-0.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-3 min-[900px]:sticky min-[900px]:top-5 min-[900px]:min-h-[calc(100dvh-var(--project-bar-height)-3rem)]"
    >
      <h2 className="px-2 pt-1 pb-2 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.title}
      </h2>
      <ol className="flex flex-col gap-0.5">
        {steps.map((s, index) => {
          const open = openKey ? s.key === openKey : pathname === s.href;
          const groupStart = s.group && s.group !== steps[index - 1]?.group;
          const next = steps[index + 1];
          const last =
            !next || (next.group !== undefined && next.group !== s.group);
          return (
            <Fragment key={s.key}>
              {groupStart && (
                <li
                  aria-hidden
                  className="px-2 pt-3 pb-1 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] font-semibold text-[color:var(--text-tertiary)]"
                >
                  {s.group}
                </li>
              )}
              <li className="relative">
                {!last && (
                  <span
                    aria-hidden
                    className="absolute top-9 bottom-[-6px] left-[19px] w-0.5 bg-[var(--border-hairline)]"
                  />
                )}
                <ViewLink
                  href={s.href}
                  aria-current={open ? "step" : undefined}
                  className={cn(
                    "relative grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2.5 rounded-lg px-2 py-2 text-left no-underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    open
                      ? "bg-[var(--surface-sunken)]"
                      : "[@media(hover:hover)]:hover:bg-[var(--surface-soft)]",
                  )}
                >
                  <StepMark step={s} />
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "text-[length:var(--type-body-sm)] leading-snug font-semibold",
                        isLocked(s.status) &&
                          "font-medium text-[color:var(--text-tertiary)]",
                        s.status === "obsolete" &&
                          "font-medium text-[color:var(--text-tertiary)] line-through",
                      )}
                    >
                      {s.title}
                      {s.blocked && (
                        <span role="img" aria-label={t.reported}>
                          <IconStop
                            aria-hidden
                            className="ml-1.5 inline size-3.5 align-[-2px] text-[color:var(--tone-danger-fg)]"
                          />
                        </span>
                      )}
                    </span>
                    <StepSub step={s} steps={steps} />
                  </span>
                </ViewLink>
              </li>
            </Fragment>
          );
        })}
      </ol>
      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {links.map((link) => (
            <ViewLink
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="rounded-lg px-2 py-1 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] underline underline-offset-4 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {link.label}
            </ViewLink>
          ))}
        </div>
      )}
    </nav>
  );
}

function StepMark({ step: s }: { step: JourneyStep }) {
  const mine = Boolean(s.actor?.viewer);
  const state: MarkState =
    s.status === "done"
      ? s.reserve
        ? "reserve"
        : "done"
      : s.status === "current" || (s.status === "waiting" && mine)
        ? mine
          ? "mine"
          : "current"
        : s.status === "waiting" || s.status === "rework"
          ? "waiting"
          : "idle";
  return (
    <StateMark state={state} dashed={isLocked(s.status)}>
      {s.status === "done" && s.reserve ? (
        <IconTriangleWarning className="size-3.5" />
      ) : s.status === "rework" ? (
        <span />
      ) : s.status === "blocked" ? (
        <IconLock className="size-3" />
      ) : s.status === "obsolete" ? (
        <IconXmark className="size-3" />
      ) : undefined}
    </StateMark>
  );
}

/** The line under a step's title: what it gave, who acts, what it waits for. */
function StepSub({
  step: s,
  steps,
}: {
  step: JourneyStep;
  steps: JourneyStep[];
}) {
  const mine = Boolean(s.actor?.viewer);
  const todo = s.actor ? lowerFirst(s.actor.todo) : undefined;
  let text: string | null = null;
  let tone: "me" | "warn" | null = null;
  if (s.status === "done") text = s.summary;
  // Waiting for the viewer (the validator looking at it): their turn, not a
  // wait (Sacha, 10/11/2026).
  else if (s.status === "waiting" && mine && todo) {
    text = t.joinTodo(t.me, todo);
    tone = "me";
  } else if (s.status === "waiting") {
    const who = t.waitingFor(s.actor?.name ?? "—");
    text = todo ? t.joinTodo(who, todo) : who;
    tone = "warn";
  } else if (s.status === "rework") {
    text = todo ? t.joinTodo(t.rework, todo) : t.rework;
    tone = "warn";
  } else if (s.status === "current" && s.actor) {
    text = t.joinTodo(mine ? t.me : s.actor.name, todo ?? "");
    tone = mine ? "me" : null;
  } else if (s.status === "current") text = s.summary;
  else if (isLocked(s.status)) {
    const missing = prereqsOf(s, steps).filter((p) => !p.done);
    text = missing.length ? t.after(missing.map(withModule).join(", ")) : null;
  }
  // Red is for what went wrong (a missed due date, what blocks); a decision
  // awaited is not an error: warning, like any wait (Sacha, 10/11/2026).
  // The decision is the viewer's own: « À vous : valider… » says it.
  if (s.alert && s.status !== "done" && !(s.alert === "decision" && mine))
    return (
      <span
        className={cn(
          "text-[length:var(--type-caption)] leading-snug font-semibold",
          s.alert === "decision"
            ? "text-[color:var(--tone-warning-fg)]"
            : "text-[color:var(--tone-danger-fg)]",
        )}
      >
        {[t.alert[s.alert], text].filter(Boolean).join(" · ")}
      </span>
    );
  if (!text) return null;
  const clip = s.clipSummary && text === s.summary;
  return (
    <span
      title={clip ? text : undefined}
      className={cn(
        "text-[length:var(--type-caption)] leading-snug text-[color:var(--text-secondary)]",
        clip && "truncate",
        tone === "me" && "font-semibold text-[color:var(--selection)]",
        tone === "warn" && "text-[color:var(--tone-warning-fg)]",
      )}
    >
      {text}
    </span>
  );
}

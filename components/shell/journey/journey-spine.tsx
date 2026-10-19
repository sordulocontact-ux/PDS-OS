"use client";

import { IconCheck, IconLock, IconXmark } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { IconStop } from "@/components/icons";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import {
  isLocked,
  type JourneyStep,
  lowerFirst,
  prereqsOf,
  withModule,
} from "@/lib/ui/journey";
import { cn } from "@/lib/utils";

const t = fr.journey;

/**
 * The journey on the left of a module (docs/VISION-UX.md § 4, proto
 * « Projet complet »): each step, its state, who acts on it or what it gave,
 * the viewer's own steps marked « À vous ». States: done (green check),
 * current (blue dot; full blue when it is the viewer's), waiting and rework
 * (warning), locked (dashed, lock, « Après : … »), obsolete (struck through);
 * a reported blocker adds a stop icon, an alert a red subtitle. Steps with a
 * `group` sit under its intertitle. The open step is the page shown on the
 * right (`openKey`, else the one whose URL is the current path); `title`
 * defaults to « Parcours » (« Parcours · Stratégie » via `t.titleOf`);
 * `footer` is a link to the module's history.
 */
export function JourneySpine({
  steps,
  openKey,
  title = t.title,
  footer,
}: {
  steps: JourneyStep[];
  openKey?: string;
  title?: string;
  footer?: { href: string; label: string };
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.label}
      className="flex flex-col gap-0.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-3 min-[900px]:sticky min-[900px]:top-5"
    >
      <h2 className="px-2 pt-1 pb-2 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {title}
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
      {footer && (
        <ViewLink
          href={footer.href}
          aria-current={pathname === footer.href ? "page" : undefined}
          className="mt-4 rounded-lg px-2 py-1 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] underline underline-offset-4 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {footer.label}
        </ViewLink>
      )}
    </nav>
  );
}

function StepMark({ step: s }: { step: JourneyStep }) {
  const mine = Boolean(s.actor?.viewer);
  const open = s.status === "current";
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 grid size-6 place-items-center rounded-full border-2 border-[color:var(--border-default)] bg-card text-[color:var(--text-tertiary)]",
        s.status === "done" &&
          "border-transparent bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
        open &&
          (mine
            ? "border-[color:var(--selection)] bg-[var(--selection)]"
            : "border-[color:var(--selection)] bg-[var(--selection-bg)]"),
        (s.status === "waiting" || s.status === "rework") &&
          "border-[color:var(--tone-warning-fg)] bg-[var(--tone-warning-bg)]",
        isLocked(s.status) && "border-dashed",
      )}
    >
      {s.status === "done" ? (
        <IconCheck className="size-3.5" />
      ) : open ? (
        <span
          className={cn(
            "size-2 rounded-full",
            mine ? "bg-white" : "bg-[var(--selection)]",
          )}
        />
      ) : s.status === "waiting" ? (
        <span className="size-2 rounded-full bg-[var(--tone-warning-fg)]" />
      ) : s.status === "blocked" ? (
        <IconLock className="size-3" />
      ) : s.status === "obsolete" ? (
        <IconXmark className="size-3" />
      ) : null}
    </span>
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
  else if (s.status === "waiting") {
    text = [t.waitingFor(s.actor?.name ?? "—"), todo]
      .filter(Boolean)
      .join(" · ");
    tone = "warn";
  } else if (s.status === "rework") {
    text = [t.rework, todo].filter(Boolean).join(" · ");
    tone = "warn";
  } else if (s.status === "current" && s.actor) {
    text = mine ? `${t.me} · ${todo}` : `${s.actor.name} · ${todo}`;
    tone = mine ? "me" : null;
  } else if (s.status === "current") text = s.summary;
  else if (isLocked(s.status)) {
    const missing = prereqsOf(s, steps).filter((p) => !p.done);
    text = missing.length ? t.after(missing.map(withModule).join(", ")) : null;
  }
  if (s.alert && s.status !== "done")
    return (
      <span className="text-[length:var(--type-caption)] leading-snug font-semibold text-[color:var(--tone-danger-fg)]">
        {[t.alert[s.alert], text].filter(Boolean).join(" · ")}
      </span>
    );
  if (!text) return null;
  return (
    <span
      className={cn(
        "text-[length:var(--type-caption)] leading-snug text-[color:var(--text-secondary)]",
        tone === "me" && "font-semibold text-[color:var(--selection)]",
        tone === "warn" && "text-[color:var(--tone-warning-fg)]",
      )}
    >
      {text}
    </span>
  );
}

"use client";

import { IconCheck, IconLock } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";

import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { JourneyStep } from "@/lib/ui/journey";
import { cn } from "@/lib/utils";

const t = fr.journey;

/**
 * The journey on the left of a module (docs/VISION-UX.md § 4): each step, its
 * state, who acts on it or what it gave, the viewer's own steps marked
 * « À vous ». The open step is the page shown on the right (`openKey`, else
 * the one whose URL is the current path); `footer` is a link to the module's
 * history.
 */
export function JourneySpine({
  steps,
  openKey,
  footer,
}: {
  steps: JourneyStep[];
  openKey?: string;
  footer?: { href: string; label: string };
}) {
  const pathname = usePathname();
  const title = (key: string) => steps.find((s) => s.key === key)?.title ?? key;
  return (
    <nav
      aria-label={t.label}
      className="flex flex-col gap-0.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-3 lg:sticky lg:top-6"
    >
      <h2 className="px-2 pt-1 pb-2 text-sm text-muted-foreground">
        {t.title}
      </h2>
      <ol className="flex flex-col gap-0.5">
        {steps.map((s, index) => {
          const href = s.href;
          const open = openKey ? s.key === openKey : pathname === href;
          const mine = Boolean(s.actor?.viewer);
          const sub =
            s.status === "done"
              ? s.summary
              : s.actor
                ? `${s.actor.name} · ${s.actor.todo.toLowerCase()}`
                : s.status === "blocked" || s.status === "upcoming"
                  ? t.after(s.prereq.map(title).join(", "))
                  : null;
          return (
            <li key={s.key} className="relative">
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-9 bottom-[-6px] left-[19px] w-0.5 bg-[var(--border-hairline)]"
                />
              )}
              <ViewLink
                href={href}
                aria-current={open ? "step" : undefined}
                className={cn(
                  "relative grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2.5 rounded-lg px-2 py-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  open
                    ? "bg-[var(--surface-sunken)]"
                    : "[@media(hover:hover)]:hover:bg-[var(--surface-soft)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 grid size-6 place-items-center rounded-full border-2 bg-card",
                    s.status === "done" &&
                      "border-transparent bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
                    s.status === "current" &&
                      (mine
                        ? "border-[color:var(--selection)] bg-[var(--selection)]"
                        : "border-[color:var(--selection)] bg-[var(--selection-bg)]"),
                    (s.status === "blocked" || s.status === "upcoming") &&
                      "border-dashed border-[color:var(--border-default)] text-muted-foreground",
                  )}
                >
                  {s.status === "done" ? (
                    <IconCheck className="size-3.5" />
                  ) : s.status === "current" ? (
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        mine ? "bg-white" : "bg-[var(--selection)]",
                      )}
                    />
                  ) : s.status === "blocked" ? (
                    <IconLock className="size-3" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "text-sm leading-snug font-semibold",
                      (s.status === "blocked" || s.status === "upcoming") &&
                        "font-medium text-muted-foreground",
                    )}
                  >
                    {s.title}
                  </span>
                  {sub && (
                    <span
                      className={cn(
                        "text-xs leading-snug text-muted-foreground",
                        mine && "font-semibold text-[color:var(--selection)]",
                      )}
                    >
                      {mine && `${t.me} · `}
                      {sub}
                    </span>
                  )}
                </span>
              </ViewLink>
            </li>
          );
        })}
      </ol>
      {footer && (
        <ViewLink
          href={footer.href}
          aria-current={pathname === footer.href ? "page" : undefined}
          className="mt-4 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {footer.label}
        </ViewLink>
      )}
    </nav>
  );
}

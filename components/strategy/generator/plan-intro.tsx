import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";

export type KnownLine = { key: string; label: string; value: string };
export type ToCompleteLine = { key: string; label: string; done: boolean };

/**
 * The generator's entry (ticket § 11, step 1): what the validated Brief
 * already says, never asked again, apart from the few choices left.
 */
export function PlanIntro({
  title,
  body,
  known,
  toComplete,
  startHref,
}: {
  title: string;
  body: string;
  known: KnownLine[];
  toComplete: ToCompleteLine[];
  startHref: string;
}) {
  const t = fr.strategyDocs.plan;
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{title}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">{body}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-body-md font-semibold">{t.known}</h3>
          <ul className="flex flex-col gap-2">
            {known.map((line) => (
              <li
                key={line.key}
                className="flex flex-col gap-0.5 rounded-2xl bg-[var(--surface-tint)] px-4 py-3"
              >
                <span className="flex items-center gap-2 text-caption text-muted-foreground">
                  <IconCheck
                    aria-hidden
                    className="size-3 text-[color:var(--tone-success-fg)]"
                  />
                  {line.label}
                </span>
                <span className="line-clamp-2 text-body-md font-semibold">
                  {line.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-body-md font-semibold">{t.toComplete}</h3>
          <ul className="flex flex-col gap-2">
            {toComplete.map((line) => (
              <li
                key={line.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="text-body-md font-semibold">{line.label}</span>
                <StatusBadge tone={line.done ? "success" : "neutral"} size="sm">
                  {line.done ? t.confirmed : fr.strategyDocs.generator.stepTodo}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link
        href={startHref}
        className={buttonVariants({ size: "lg", className: "self-start" })}
      >
        {t.start}
      </Link>
    </section>
  );
}

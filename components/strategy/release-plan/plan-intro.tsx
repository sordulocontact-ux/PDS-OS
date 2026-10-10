import { IconCheck } from "nucleo-sharp-essential";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { doneTone, draftTone } from "@/lib/ui/state-tones";

/**
 * Step 1 (ticket § 11): « Créons le Plan de sortie ». What the validated
 * strategy already says is shown, never asked again; what the document
 * still needs is listed apart, each with its state.
 */
export function PlanIntro({
  known,
  toComplete,
  startHref,
  canEdit,
  title,
  body,
}: {
  // The document's own entry (the Plan de sortie's by default).
  title?: string;
  body?: string;
  known: Array<{ label: string; value: string | null }>;
  toComplete: Array<{
    key: string;
    label: string;
    done: boolean;
    href: string;
  }>;
  startHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyReleasePlan.intro;
  return (
    <section aria-labelledby="plan-intro" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id="plan-intro" className="text-display-sm font-semibold">
          {title ?? t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {body ?? t.body}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-body-md font-semibold">{t.known}</h3>
          <p className="text-caption text-muted-foreground">{t.knownHint}</p>
        </div>
        <FactList facts={known} emptyLabel={t.notProvided} />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-body-md font-semibold">{t.toComplete}</h3>
        <ul className="flex flex-col gap-2">
          {toComplete.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-body-md transition-[background-color] duration-[var(--duration-fast)] hover:bg-[var(--control-bg-hover)]"
              >
                <span className="font-medium">{item.label}</span>
                <StatusBadge tone={item.done ? doneTone : draftTone} size="sm">
                  {item.done && <IconCheck aria-hidden className="size-3" />}
                  {item.done ? t.confirmed : fr.strategyReleasePlan.stepTodo}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {canEdit && (
        <Link
          href={startHref}
          className={buttonVariants({ size: "lg", className: "self-start" })}
        >
          {t.start}
        </Link>
      )}
    </section>
  );
}

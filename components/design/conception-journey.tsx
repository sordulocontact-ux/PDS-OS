import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type {
  JourneyLink,
  JourneyNext,
  JourneyStep,
} from "@/lib/design/journey";
import { fr } from "@/lib/i18n/fr";
import { journeyStepTone } from "@/lib/ui/state-tones";

/**
 * The Conception's journey on its home (MKT-C2-03): the one next action —
 * where it opens said before the click —, the six steps of the dossier with
 * their state and what each produced, and what blocks. Computed by code
 * (lib/design/journey.ts); a step's own screen opens from its object.
 * `exchangeAction`: preparing another creative exchange, on its step.
 */
export function ConceptionJourney({
  steps,
  next,
  blockers,
  exchangeAction,
}: {
  steps: JourneyStep[];
  next: JourneyNext;
  blockers: JourneyLink[];
  exchangeAction?: React.ReactNode;
}) {
  const t = fr.conceptionJourney;
  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="journey-next"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5"
      >
        <h3
          id="journey-next"
          className="text-caption font-medium text-muted-foreground"
        >
          {t.next.title}
        </h3>
        {next.kind === "action" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-md text-muted-foreground">
              {t.next.opens(next.action.place)}
            </p>
            <ViewLink
              href={next.action.href}
              className={buttonVariants({
                size: "lg",
                className: "shrink-0 self-start sm:self-center",
              })}
            >
              {next.action.label}
            </ViewLink>
          </div>
        ) : (
          <p className="text-body-md text-muted-foreground">
            {next.kind === "read_only"
              ? t.next.readOnly
              : next.what
                ? t.next.waiting(next.what)
                : t.next.nothing}
          </p>
        )}
      </section>

      <section
        aria-labelledby="journey-progress"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-0.5">
          <h3 id="journey-progress" className="text-body-lg font-semibold">
            {t.progressTitle}
          </h3>
          <p className="text-caption text-muted-foreground">{t.progressHint}</p>
        </div>
        <ol className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-background">
          {steps.map((step, index) => (
            <li
              key={step.key}
              aria-current={step.state === "current" ? "step" : undefined}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="text-caption font-semibold text-muted-foreground tabular-nums sm:w-5">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body-md font-medium">
                  {t.steps[step.key]}
                </span>
                <span className="text-caption text-muted-foreground">
                  {step.summary}
                </span>
              </div>
              {step.key === "exchange" && exchangeAction}
              <StatusBadge
                tone={journeyStepTone[step.state]}
                size="sm"
                className="self-start sm:self-center"
              >
                {t.stepStates[step.state]}
              </StatusBadge>
            </li>
          ))}
        </ol>
      </section>

      {blockers.length > 0 && (
        <section
          aria-labelledby="journey-blockers"
          className="flex flex-col gap-3"
        >
          <h3 id="journey-blockers" className="text-body-lg font-semibold">
            {t.blockersTitle}
          </h3>
          <ul className="flex flex-col gap-2">
            {blockers.map((b) => (
              <li key={b.label}>
                <ViewLink
                  href={b.href}
                  className="flex flex-col gap-0.5 rounded-xl px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]"
                >
                  <span className="text-body-md">{b.label}</span>
                  <span className="text-caption text-muted-foreground">
                    {t.next.opens(b.place)}
                  </span>
                </ViewLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { JourneyStep } from "@/lib/ui/journey";
import { journeyStatusTone } from "@/lib/ui/state-tones";

const t = fr.journey;

/**
 * One step of the journey, as the right side of a module: its title
 * and state, why it matters, then who is responsible, who validates, what it
 * needs and what follows (Ibé: « chaque étape a une logique, un responsable,
 * des prérequis et une suite claire »), then its own content.
 */
export function StepPanel({
  step,
  steps,
  rootPrereq,
  children,
}: {
  step: JourneyStep;
  steps: JourneyStep[];
  // Shown when the step needs nothing before it.
  rootPrereq?: string;
  children: React.ReactNode;
}) {
  const of = (key: string) => steps.find((s) => s.key === key);
  const pre = step.prereq.map(of).filter((s): s is JourneyStep => Boolean(s));
  const next = step.next.map(of).filter((s): s is JourneyStep => Boolean(s));
  return (
    <section
      aria-labelledby="journey-step-title"
      className="flex min-w-0 flex-col gap-6"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="journey-step-title"
            className="text-display-sm font-medium text-balance"
          >
            {step.title}
          </h2>
          <StatusBadge tone={journeyStatusTone[step.status]}>
            {t.status[step.status]}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">{step.why}</p>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-soft)] p-4 text-sm xl:grid-cols-4">
          <Meta label={t.meta.owner}>
            {step.owner ? (
              <>
                {step.owner.name}
                <br />
                <span className="text-muted-foreground">{step.owner.role}</span>
              </>
            ) : (
              "—"
            )}
          </Meta>
          <Meta label={t.meta.validation}>
            {step.validator ? (
              <>
                {step.validator.name}
                <br />
                <span className="text-muted-foreground">
                  {step.validator.role}
                </span>
              </>
            ) : (
              t.meta.none
            )}
          </Meta>
          <Meta label={t.meta.prereq}>
            {pre.length === 0
              ? `✓ ${rootPrereq ?? t.meta.noPrereq}`
              : pre.map((p) => (
                  <span
                    key={p.key}
                    className={
                      p.status === "done"
                        ? "block text-[color:var(--tone-success-fg)]"
                        : "block text-muted-foreground"
                    }
                  >
                    {p.status === "done" ? "✓" : "○"} {p.title}
                  </span>
                ))}
          </Meta>
          <Meta label={t.meta.next}>
            {next.length === 0
              ? "—"
              : next.map((n) => (
                  <span key={n.key} className="block">
                    {n.title}
                  </span>
                ))}
          </Meta>
        </dl>
        {step.status === "blocked" && (
          <ToneCallout tone="info">
            {t.blocked(
              pre
                .filter((p) => p.status !== "done")
                .map((p) => p.title)
                .join(" et "),
            )}
          </ToneCallout>
        )}
      </div>
      {children}
    </section>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="leading-snug break-words">{children}</dd>
    </div>
  );
}

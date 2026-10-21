import { fr } from "@/lib/i18n/fr";
import {
  type JourneyRole,
  type JourneyStep,
  nextOf,
  prereqsOf,
  withModule,
} from "@/lib/ui/journey";
import { cn } from "@/lib/utils";

const t = fr.journey.meta;

// Beyond three, « et n autres » (proto, Juridique).
const MAX_NEXT = 3;

/**
 * The grid of an open step (proto « Projet complet »): Exécute / Coordonne /
 * Valide / Prérequis / Ensuite when the step names who executes or
 * coordinates (Cadrage, Marketing), else Responsable / Validation /
 * Prérequis / Ensuite. Prerequisites of another module carry its name and
 * their source; two columns under 1200 px.
 */
export function StepMeta({
  step,
  steps,
  rootPrereq,
}: {
  step: JourneyStep;
  steps: JourneyStep[];
  rootPrereq?: string;
}) {
  const roles = step.roles ?? fromOwner(step);
  const of = (kind: JourneyRole["kind"]) =>
    roles.filter((r) => r.kind === kind);
  const five = roles.some((r) => r.kind === "exec" || r.kind === "coord");
  const pre = prereqsOf(step, steps);
  const next = nextOf(step, steps);
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5",
        five ? "min-[1200px]:grid-cols-5" : "min-[1200px]:grid-cols-4",
      )}
    >
      {five ? (
        <>
          <Cell label={t.exec}>
            <People people={of("exec")} empty={t.toAppoint} />
          </Cell>
          <Cell label={t.coord}>
            <People people={of("coord")} empty="—" />
          </Cell>
          <Cell label={t.valid}>
            <People people={of("valid")} empty={t.noValidation} />
          </Cell>
        </>
      ) : (
        <>
          <Cell label={t.owner}>
            <People people={of("owner")} empty="—" />
          </Cell>
          <Cell label={t.validation}>
            <People people={of("valid")} empty={t.none} />
          </Cell>
        </>
      )}
      <Cell label={t.prereq}>
        {pre.length === 0 ? (
          // « Aucun » is plain (proto); a root prerequisite is done (✓).
          rootPrereq ? (
            <span className="block text-[color:var(--tone-success-fg)]">
              ✓ {rootPrereq}
            </span>
          ) : (
            <span className="block">{t.noPrereq}</span>
          )
        ) : (
          pre.map((p) => (
            <span key={`${p.module ?? ""}${p.key}`} className="block">
              <span
                className={
                  p.done
                    ? "text-[color:var(--tone-success-fg)]"
                    : "text-[color:var(--text-tertiary)]"
                }
              >
                {p.done ? "✓" : "○"} {withModule(p)}
              </span>
              {p.source && (
                <span className="block text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                  {p.source}
                </span>
              )}
            </span>
          ))
        )}
      </Cell>
      <Cell label={t.next}>
        {next.length === 0
          ? "—"
          : next.slice(0, MAX_NEXT).map((n) => (
              <span key={`${n.module ?? ""}${n.key}`} className="block">
                {n.who
                  ? fr.journey.nextBy(withModule(n), n.who)
                  : withModule(n)}
              </span>
            ))}
        {next.length > MAX_NEXT && (
          <span className="block text-[color:var(--text-secondary)]">
            {t.more(next.length - MAX_NEXT)}
          </span>
        )}
      </Cell>
    </dl>
  );
}

// Loaders that give owner / validator only: the 4-column grid.
function fromOwner(step: JourneyStep): JourneyRole[] {
  return [
    ...(step.owner ? [{ kind: "owner" as const, ...step.owner }] : []),
    ...(step.validator ? [{ kind: "valid" as const, ...step.validator }] : []),
  ];
}

function People({ people, empty }: { people: JourneyRole[]; empty: string }) {
  if (people.length === 0) return <>{empty}</>;
  return (
    <>
      {people.map((p, i) => (
        <span key={`${p.name}-${i}`} className="block">
          {p.name}
          {p.viaLink && (
            <span className="text-[color:var(--text-secondary)]">
              {" "}
              · {fr.journey.privateLink}
            </span>
          )}
          <span className="block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
            {p.role}
          </span>
        </span>
      ))}
    </>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
        {label}
      </dt>
      <dd className="text-[length:var(--type-body-sm)] leading-snug break-words">
        {children}
      </dd>
    </div>
  );
}

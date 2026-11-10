import { DelegateButton } from "@/components/legal/tracking/delegate-button";
import { StepSection } from "@/components/shell/journey/step-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { journey } from "@/lib/i18n/fr/journey";
import { legal } from "@/lib/i18n/fr/legal";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import type { Demarche } from "@/lib/legal/demarches/build";
import { type JourneyStep, prereqsOf } from "@/lib/ui/journey";
import type { Tone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { journey, legal, legalDemarches };

const t = fr.legalDemarches.launched;

type Person = { personId: string; name: string };

/**
 * The démarches of a launched plan (JUR-05, proto Juridique v3): the
 * immediate ones apart from the dependent ones; each says its nature, who
 * answers for it and by when, what it waits for (✓ done, ○ not yet), where
 * it stands, « Modifier » (responsible and due date, with why) and
 * « Ouvrir » to its step.
 */
export function LaunchedDemarches({
  projectId,
  demarches,
  steps,
  people,
}: {
  projectId: string;
  demarches: Demarche[];
  steps: JourneyStep[];
  // Who may answer for a démarche; empty: no « Modifier ».
  people: Person[];
}) {
  if (demarches.length === 0) return null;
  // Its own prerequisites, the plan aside (every démarche follows it).
  const prereqs = (d: Demarche) =>
    prereqsOf(d.step, steps).filter((p) => p.key !== "plan");
  const immediate = demarches.filter((d) => prereqs(d).length === 0);
  const dependent = demarches.filter((d) => prereqs(d).length > 0);
  const section = (list: Demarche[], kind: "immediate" | "dependent") =>
    list.length > 0 && (
      <StepSection title={fr.legal.plan.sections[kind].title(list.length)}>
        <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)] bg-card">
          {list.map((d) => (
            <Row
              key={d.step.key}
              projectId={projectId}
              demarche={d}
              kind={kind}
              prereqs={prereqs(d)}
              people={people}
            />
          ))}
        </ul>
      </StepSection>
    );
  return (
    <>
      {section(immediate, "immediate")}
      {section(dependent, "dependent")}
    </>
  );
}

function stateOf(step: JourneyStep): { tone: Tone; label: string } {
  if (step.status === "done") return { tone: "success", label: t.state.done };
  if (step.status === "obsolete")
    return { tone: "neutral", label: t.state.obsolete };
  if (step.status === "blocked")
    return { tone: "neutral", label: t.state.blocked };
  if (step.alert === "overdue")
    return { tone: "danger", label: t.state.overdue };
  if (step.status === "waiting")
    return { tone: "warning", label: t.state.waiting };
  return { tone: "info", label: t.state.current };
}

function Row({
  projectId,
  demarche,
  kind,
  prereqs,
  people,
}: {
  projectId: string;
  demarche: Demarche;
  kind: "immediate" | "dependent";
  prereqs: ReturnType<typeof prereqsOf>;
  people: Person[];
}) {
  const { step, own } = demarche;
  const state = stateOf(step);
  const open = step.status !== "done" && step.status !== "obsolete";
  const facts = [
    t.responsible(own?.responsibleName ?? fr.legal.plan.noResponsible),
    own?.dueOn ? t.due(formatDay(own.dueOn)) : null,
    prereqs.length > 0
      ? t.prereq(
          prereqs.map((p) => `${p.done ? "✓" : "○"} ${p.label}`).join(", "),
        )
      : fr.legal.plan.noPrereq,
  ].filter(Boolean);
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-3.5 py-3">
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.5">
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
          {fr.legal.plan.groups[demarche.items[0]?.kind ?? "contract"]} ·{" "}
          {t.nature[kind]}
        </span>
        <span className="font-semibold break-words">{step.title}</span>
        <span
          className={
            step.alert === "overdue"
              ? "text-[length:var(--type-body-sm)] text-[color:var(--tone-danger-fg)]"
              : "text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]"
          }
        >
          {facts.join(" · ")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={state.tone} size="sm">
          {state.label}
        </StatusBadge>
        {open && own && people.length > 0 && (
          <DelegateButton
            projectId={projectId}
            itemId={own.id}
            label={step.title}
            responsibleId={own.responsibleId}
            dueOn={own.dueOn}
            people={people}
            triggerLabel={t.edit}
          />
        )}
        <ViewLink
          href={step.href}
          className={buttonVariants({ variant: "outline", size: "xs" })}
        >
          <ButtonRoll>{fr.journey.now.openShort}</ButtonRoll>
        </ViewLink>
      </div>
    </li>
  );
}

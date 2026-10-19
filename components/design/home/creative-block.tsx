import { DesignBlock } from "@/components/design/design-block";
import { DesignateInline } from "@/components/design/people/designate-inline";
import { DesignWaits } from "@/components/design/waiting-row";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import type { DesignJourneyContext } from "@/lib/design/journey-context";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.home.creative;

/**
 * « Responsable créatif » (proto de0, crset): designated by the project's
 * owner — PO's suggestion pre-selected, never assigned without them — then
 * « Responsable créatif · Nadia Benali · désigné par Lina Haddad ».
 */
export function CreativeBlock({ ctx }: { ctx: DesignJourneyContext }) {
  const responsible = ctx.people.direction.responsible;
  if (responsible)
    return (
      <FactRows>
        <FactRow
          label={t.title}
          value={<b className="font-semibold">{responsible.name}</b>}
          source={
            ctx.start.creativeBy ? t.by(ctx.nameOf(ctx.start.creativeBy)) : null
          }
        />
      </FactRows>
    );
  const home = ctx.steps[0];
  if (!ctx.isOwner)
    return (
      <DesignWaits
        step={home}
        actors={
          home.actor?.todo === fr.designJourney.todo.designate
            ? [home.actor]
            : []
        }
      />
    );
  const members = ctx.people.members;
  const suggestion =
    ctx.people.suggestions.find((s) =>
      members.some((m) => m.personId === s.personId),
    ) ?? null;
  return (
    <DesignBlock title={t.title}>
      <DesignateInline
        projectId={ctx.project.id}
        scope="direction"
        sheetId={null}
        name="creative"
        label={t.label}
        members={members}
        suggestion={suggestion}
        hint={suggestion ? t.suggestion(suggestion.name) : t.noSuggestion}
        done={t.done}
      />
    </DesignBlock>
  );
}

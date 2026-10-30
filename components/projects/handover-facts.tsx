import { BlockFact, FactBlock, FactBlockRow } from "@/components/ui/fact-block";
import { NameChip, NameChips } from "@/components/ui/name-chip";
import { routes } from "@/lib/auth/redirects";
import { masterLabel } from "@/lib/catalog/types";
import { shell } from "@/lib/i18n/fr/shell";
import { transmission } from "@/lib/i18n/fr/transmission";
import { projectDateLabel, projectKindLabel } from "@/lib/projects/labels";
import type { CreativeMember } from "@/lib/projects/creatives";
import type { ProjectDetail } from "@/lib/projects/types";
import { formatDay } from "@/lib/utils/day";

const fr = { shell, transmission };

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Not entered at creation: said as such, the Cadrage asks for it. */
function Missing() {
  const t = fr.transmission.page.facts;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[color:var(--text-tertiary)]">{t.none}</span>
      <span className="text-caption text-[color:var(--text-tertiary)]">
        {t.later}
      </span>
    </span>
  );
}

/**
 * What a project not launched yet holds, said once (Sacha 30/10/2026, the
 * block of the planned call): `head` (who transmitted it, when), the
 * direction's message, then type and date, budget and priority, the titles
 * (each opens its page), the creative directors and the initial context.
 * What is missing reads « Pas encore renseigné · Le Cadrage le demandera »
 * on its own line (PROJ-UX-02), never guessed.
 */
export function HandoverFacts({
  project,
  creatives,
  head,
  note,
}: {
  project: ProjectDetail;
  creatives: CreativeMember[];
  head?: React.ReactNode;
  note?: { by: string; text: string } | null;
}) {
  const t = fr.transmission.page.facts;
  const kind = projectKindLabel({
    type: project.type,
    musicFormat: project.musicFormat,
    contentFormatName: project.contentFormat?.name ?? null,
  });
  return (
    <FactBlock>
      {head}
      {note && (
        <BlockFact label={t.message(note.by)}>
          <span className="whitespace-pre-line">{note.text}</span>
        </BlockFact>
      )}
      <FactBlockRow>
        <BlockFact label={t.type}>
          {[kind, project.artistName].filter(Boolean).join(" · ")}
        </BlockFact>
        <BlockFact label={projectDateLabel(project.type)}>
          {project.dueDate ? formatDay(project.dueDate) : <Missing />}
        </BlockFact>
      </FactBlockRow>
      <FactBlockRow>
        <BlockFact label={t.budget}>
          {project.budgetCents !== null ? (
            <span className="tabular-nums">
              {euroFormatter.format(project.budgetCents / 100)}
            </span>
          ) : (
            <Missing />
          )}
        </BlockFact>
        <BlockFact label={t.priority}>
          {project.priority ? (
            fr.shell.priorities[project.priority]
          ) : (
            <span className="text-[color:var(--text-tertiary)]">{t.none}</span>
          )}
        </BlockFact>
      </FactBlockRow>
      {project.type === "music_release" && (
        <BlockFact label={t.titles}>
          {project.masters.length > 0 ? (
            <NameChips>
              {project.masters.map((master) => (
                <NameChip
                  key={master.id}
                  name={masterLabel(master)}
                  href={routes.master(master.id)}
                />
              ))}
            </NameChips>
          ) : (
            <Missing />
          )}
        </BlockFact>
      )}
      <BlockFact label={t.creatives}>
        {creatives.length > 0 ? (
          <NameChips>
            {creatives.map((c) => (
              <NameChip key={c.personId} name={c.name} person />
            ))}
          </NameChips>
        ) : (
          <span className="text-[color:var(--text-tertiary)]">{t.nobody}</span>
        )}
      </BlockFact>
      <BlockFact label={t.context}>
        {project.initialContext?.trim() ? (
          <span className="whitespace-pre-line">{project.initialContext}</span>
        ) : (
          <Missing />
        )}
      </BlockFact>
    </FactBlock>
  );
}

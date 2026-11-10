import { HeritageList } from "@/components/production/prep/heritage-list";
import { StepSection } from "@/components/shell/journey/step-section";
import { FactList, type Fact } from "@/components/ui/fact-list";
import { formatEuros } from "@/lib/budget/types";
import { productionPrep } from "@/lib/i18n/fr/production-prep";
import {
  ficheDuration,
  fichePeriod,
  ficheSubtitles,
} from "@/lib/production/heritage-facts";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";

const fr = { productionPrep };

const t = fr.productionPrep.heritage;

const topicLabel = (topic: string) =>
  topic in t.topics ? t.topics[topic as keyof typeof t.topics] : topic;

/**
 * What Conception already decided for the deliverable (ticket, parcours 1):
 * the Fiche Livrable handed over (facts, concept, intention, constraints,
 * dates, budget, dependencies, what it leaves to Production, references),
 * else what the Conception's work says. Read only: PO never asks for it
 * again, and an empty fact says so instead of being guessed.
 */
export function HeritageSection({ data }: { data: ProductionSheetData }) {
  const { deliverable: d, heritage: h } = data;
  const f = h.fiche;
  const notFilled = <span title={t.notFilledHint}>{t.notFilled}</span>;
  const responsible = f?.responsiblePersonId
    ? (data.members.find((m) => m.personId === f.responsiblePersonId)?.name ??
      null)
    : d.assigneeName;

  const facts: Fact[] = [
    { label: t.facts.lever, value: d.leverLabel },
    {
      label: t.facts.quantity,
      value: d.quantity !== null ? String(d.quantity) : null,
    },
    { label: t.facts.assignee, value: responsible },
    { label: t.facts.duration, value: f ? ficheDuration(f) : null },
    { label: t.facts.ratios, value: f?.ratios.join(", ") || null },
    { label: t.facts.subtitles, value: f ? ficheSubtitles(f) : null },
    {
      label: t.facts.shoot,
      value: f?.shootDate ? formatDate(f.shootDate) : null,
    },
    {
      label: t.facts.post,
      value: f ? fichePeriod(f.postStart, f.postDeadline) : null,
    },
    {
      label: t.facts.delivery,
      value: f?.deliveryDate
        ? formatDate(f.deliveryDate)
        : d.dueDate
          ? formatDate(d.dueDate)
          : null,
    },
    f
      ? {
          label: t.facts.ficheBudget,
          value: f.budgetCents !== null ? formatEuros(f.budgetCents) : null,
        }
      : {
          label: t.facts.budget,
          value: h.budget
            ? t.budgetLine(
                formatEuros(h.budget.committedCents),
                formatEuros(h.budget.plannedCents),
              )
            : null,
        },
  ];

  const direction = h.intentions.filter((i) => i.scope === "direction");
  const own = f
    ? f.intentions.map((i) => ({ topic: i.topic, value: i.value }))
    : h.intentions.filter((i) => i.scope === "deliverable");

  return (
    <StepSection id="heritage" title={t.title} description={t.description}>
      <FactList emptyLabel={t.notFilled} facts={facts} />

      <div className="grid gap-6 pt-6 md:grid-cols-2">
        <HeritageList title={t.concept} empty={notFilled}>
          {f?.concept && (
            <Entry key="concept" label={t.conceptLabel} value={f.concept} />
          )}
          {f?.intention && (
            <Entry
              key="intention"
              label={t.intentionLabel}
              value={f.intention}
            />
          )}
          {own.map((i) => (
            <Entry key={i.topic} label={topicLabel(i.topic)} value={i.value} />
          ))}
          {direction.map((i) => (
            <Entry
              key={`direction-${i.topic}`}
              label={`${topicLabel(i.topic)} · ${t.direction}`}
              value={i.value}
            />
          ))}
          {f?.constraints && (
            <Entry
              key="constraints"
              label={t.constraints}
              value={f.constraints}
            />
          )}
          {f && f.items.length > 0 && (
            <Entry
              key="items"
              label={t.items}
              value={f.items.map((i) => `${i.number}. ${i.title}`).join("\n")}
            />
          )}
        </HeritageList>

        <div className="flex flex-col gap-6">
          <HeritageList title={t.openPoints} empty={t.noOpenPoints}>
            {f?.productionNotes && (
              <Entry
                key="notes"
                label={t.productionNotes}
                value={f.productionNotes}
              />
            )}
            {!f &&
              h.missingTopics.map((topic) => (
                <li key={topic}>{t.missingTopic(t.topics[topic])}</li>
              ))}
            {!f && h.pendingProposals > 0 && (
              <li key="pending">{t.pendingProposals(h.pendingProposals)}</li>
            )}
          </HeritageList>

          <HeritageList title={t.dependencies} empty={notFilled}>
            {f?.dependencies && (
              <li key="fiche" className="whitespace-pre-line">
                {f.dependencies}
              </li>
            )}
            {!f && h.source && (
              <li key="source">{t.dependsOnConception(h.source.number)}</li>
            )}
          </HeritageList>

          <HeritageList title={t.milestones} empty={notFilled}>
            {h.milestones.map((m) => (
              <li key={`${m.occursOn}-${m.title}`}>
                <span className="tabular-nums">{formatDate(m.occursOn)}</span>
                {" · "}
                {m.title}
              </li>
            ))}
          </HeritageList>

          <HeritageList title={t.references} empty={notFilled}>
            {(f
              ? f.references.map((r) => ({
                  url: r.url,
                  label: r.title ?? r.note ?? r.fileName ?? r.url ?? "",
                }))
              : h.references.map((r) => ({
                  url: r.url,
                  label: r.note ?? r.url,
                }))
            ).map((r, index) => (
              <li key={`${index}-${r.label}`} className="break-all">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {r.label}
                  </a>
                ) : (
                  r.label
                )}
              </li>
            ))}
          </HeritageList>
        </div>
      </div>
    </StepSection>
  );
}

function Entry({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="break-words whitespace-pre-line">{value}</span>
    </li>
  );
}

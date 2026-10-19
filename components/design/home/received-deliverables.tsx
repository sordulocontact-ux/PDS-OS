import { ReceivedHead } from "@/components/design/home/received-head";
import { RemoveDeliverableButton } from "@/components/design/remove-deliverable-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import type { DesignJourneyContext } from "@/lib/design/journey-context";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.home;

/**
 * « Livrables reçus (n) » (proto de0): one compact line per deliverable
 * with its sheet (« Fiche unique », « Fiche série · 4 éléments »), where it
 * comes from, Confirmé or À qualifier; « Ajouter un livrable » for the
 * owner while the Conception is open, « Retirer » on a late addition.
 */
export function ReceivedDeliverables({ ctx }: { ctx: DesignJourneyContext }) {
  const { data } = ctx;
  const canAdd = data.canAdd;
  const rows = [...data.deliverables].sort(
    (a, b) =>
      Number(a.status !== "confirmed") - Number(b.status !== "confirmed"),
  );
  return (
    <ReceivedHead
      projectId={ctx.project.id}
      count={rows.length}
      canAdd={canAdd}
      calls={data.calls}
      levers={data.levers}
    >
      {rows.length === 0 ? (
        <p className="text-body-sm text-[color:var(--text-secondary)]">
          {t.noneReceived}
        </p>
      ) : (
        <FactRows>
          {rows.map((d) => {
            const sheet = ctx.sheets.find(
              (s) => s.facts.sheet.design_deliverable_id === d.id,
            );
            const form =
              sheet?.facts.sheet.kind === "series"
                ? t.series(sheet.facts.items.length)
                : t.single;
            const confirmed = d.status === "confirmed";
            return (
              <div key={d.id} id={`deliverable-${d.id}`}>
                <FactRow
                  value={
                    <>
                      <b className="font-semibold">{d.title}</b> · {form}
                    </>
                  }
                  source={
                    d.origin === "strategy"
                      ? t.fromStrategy
                      : t.addedBy(
                          t.form.origins[d.origin],
                          ctx.nameOf(d.createdBy) || "—",
                          d.note ?? "—",
                        )
                  }
                  state={{
                    tone: confirmed ? "neutral" : "warning",
                    label: confirmed ? t.confirmed : t.toQualify,
                  }}
                  side={
                    !confirmed && canAdd ? (
                      <RemoveDeliverableButton
                        projectId={ctx.project.id}
                        deliverableId={d.id}
                      />
                    ) : undefined
                  }
                />
              </div>
            );
          })}
        </FactRows>
      )}
    </ReceivedHead>
  );
}

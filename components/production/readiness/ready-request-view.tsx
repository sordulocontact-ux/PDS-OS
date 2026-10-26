import { ReadyDecision } from "@/components/production/readiness/ready-decision";
import { ReadySynthesisTable } from "@/components/production/readiness/ready-synthesis-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import { shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { formatDay } from "@/lib/utils/day";

const r = fr.productionReady;

type Request = NonNullable<
  NonNullable<ProductionSheetData["sheet"]>["readyRequest"]
>;

/** A derogation before the shoot waiting for the direction (recette 23/10,
 * MKT-PROD-002): the synthesis as asked, the reason, the catch-up plan, and
 * the decision for who decides — never the asker. */
export function ReadyRequestView({
  projectId,
  deliverableId,
  request,
  decides,
}: {
  projectId: string;
  deliverableId: string;
  request: Request;
  decides: boolean;
}) {
  return (
    <>
      <ToneCallout tone="warning">
        {decides
          ? r.toDecide(request.by ?? "—")
          : r.pending(request.by ?? "—", shortStamp(request.at))}
      </ToneCallout>
      <ReadySynthesisTable rows={request.rows} />
      <p>{r.reasonGiven(request.reason)}</p>
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">{r.plan.title}</h3>
        <ul className="flex flex-col gap-1">
          {request.plan.map((l) => (
            <li key={l.key}>
              {r.plan.line(l.label, l.person ?? "—", formatDay(l.dueOn))}
            </li>
          ))}
        </ul>
      </section>
      {decides && (
        <ReadyDecision projectId={projectId} deliverableId={deliverableId} />
      )}
    </>
  );
}

import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { LocationsBoard } from "@/components/production/locations/locations-board";
import { PlaceDecisions } from "@/components/production/locations/place-decisions";
import {
  ReplacePlaceButton,
  type ReviewHolder,
} from "@/components/production/locations/replace-place-button";
import { LocationSection } from "@/components/production/preprod/location-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { loadLocations } from "@/lib/production/locations/queries";
import { loadPlaceDecisions, placeFit } from "@/lib/production/place";
import { activeQuote } from "@/lib/production/quotes/queries";
import type { Holder } from "@/lib/production/sheet";
import { loadStepTools } from "@/lib/step-tools/queries";

const t = fr.productionPlace;
// One shoot day until another is decided (proto shootDays).
const SHOOT_DAYS = 1;

export const metadata = {
  title: `${fr.productionJourney.steps.locations.title} · ${fr.app.name}`,
};

/** « Lieux » (proto BODY.locs): proposed (by the company through its link
 * in external), given opinions by role, one retained by the project's
 * side — its price against what the quote plans for the places —, then
 * replaced if needed, the former decision kept (PROD-011 to 013). */
export default async function ProductionLocationsStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/locations">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "locations",
  );
  const { data, sheet, o, links, common, people } = await prepContext(
    projectId,
    deliverableId,
  );
  const [locations, quote, tools] = await Promise.all([
    loadLocations(sheet.id, data, access),
    activeQuote(sheet.id),
    loadStepTools(projectId),
  ]);
  const nameOf = (id: string | null) =>
    id ? (data.members.find((m) => m.personId === id)?.name ?? null) : null;
  const decisions = await loadPlaceDecisions(
    sheet.id,
    nameOf,
    (id) => locations.options.find((x) => x.id === id)?.name ?? "—",
  );
  const fits = Object.fromEntries(
    locations.options.flatMap((x) => {
      const f = placeFit(x.priceCents, SHOOT_DAYS, quote);
      return f ? [[x.id, { ok: f.ok, text: f.text }]] : [];
    }),
  );
  const chosen = locations.options.find((x) => x.status === "chosen") ?? null;
  const org = sheet.organization;
  const asReview = (h: Holder | null): ReviewHolder =>
    h
      ? {
          name: h.name,
          personId: h.kind === "person" ? h.id : null,
          contactId: h.kind === "contact" ? h.id : null,
        }
      : null;
  const exec =
    org.kind === "external"
      ? asReview(org.company)
      : org.lineProducer
        ? asReview({
            kind: "person",
            id: org.lineProducer.personId,
            name: org.lineProducer.name,
          })
        : null;
  const notes = tools.notes.filter(
    (n) =>
      n.module === "production" &&
      n.subjectId === deliverableId &&
      n.stepKey === "locations" &&
      !n.discarded &&
      (n.status === "to_confirm" || n.status === "pending_decision"),
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(sheet.closedAt)}
    >
      {chosen && (
        <ToneCallout tone="success">
          <b className="font-semibold">{t.retained(chosen.name)}</b>
          {t.same}
          {fits[chosen.id] && <> {fits[chosen.id].text}.</>}
        </ToneCallout>
      )}
      <LocationSection
        {...common}
        logistics={sheet.logistics}
        derogation={
          o.checks.find((c) => c.key === "location")?.derogation ?? null
        }
      >
        {access.organizationId && (
          <LocationsBoard
            scope={{
              projectId,
              sheetId: sheet.id,
              organizationId: access.organizationId,
            }}
            data={locations}
            links={links}
            canOrganize={data.canOrganize}
            budgetNotes={fits}
            {...people}
          />
        )}
      </LocationSection>
      <PlaceDecisions decisions={decisions} />
      {chosen && data.canOrganize && (
        <ReplacePlaceButton
          projectId={projectId}
          current={chosen.name}
          candidates={locations.options
            .filter(
              (x) => x.status === "candidate" && x.verification === "verified",
            )
            .map((x) => {
              const f = placeFit(x.priceCents, SHOOT_DAYS, quote);
              return {
                id: x.id,
                name: x.name,
                detail: [
                  x.priceCents !== null ? formatEuros(x.priceCents) : null,
                  f
                    ? f.ok
                      ? t.replace.fitsShort
                      : t.replace.overShort(formatEuros(f.gapCents))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                fit: f ? { ok: f.ok, text: f.text } : null,
              };
            })}
          notes={notes.map((n) => ({
            id: n.id,
            body: n.body,
            source: fr.stepTools.sources[n.source],
          }))}
          holders={{
            creative: asReview(sheet.director),
            gear: exec,
            plan: exec,
            budget: quote ? exec : null,
          }}
        />
      )}
    </ProductionStepPanel>
  );
}

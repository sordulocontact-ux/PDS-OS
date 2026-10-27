import { CallFacts } from "@/components/calls/call-facts";
import { DeliverForm } from "@/components/production/delivery/deliver-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { productionLight } from "@/lib/i18n/fr/production-light";
import { productionProducer } from "@/lib/i18n/fr/production-producer";
import { recipientOptions } from "@/lib/production/delivery/recipients";
import type { LightFacts } from "@/lib/production/light/types";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { coverChecks, trackOf } from "@/lib/production/track";
import { formatShortInstant } from "@/lib/utils/day";

import { LightControlForm } from "./light-control-form";
import { LightDecision } from "./light-decision";
import { LightDepositForm } from "./light-deposit-form";
import { LightVersions } from "./light-versions";

const fr = { productionLight, productionProducer };

const t = fr.productionLight;
const SENT_BACK = ["changes_requested", "refused"];

type Common = {
  projectId: string;
  data: ProductionSheetData;
  facts: LightFacts;
};

const running = (data: ProductionSheetData) =>
  data.stageState === "in_progress" && !data.sheet?.closedAt;

/** « Versions » / « Versions de la pochette » (proto lightBody versions). */
export function LightVersionsStep({
  projectId,
  data,
  facts,
  organizationId,
  canReview,
}: Common & { organizationId: string | null; canReview: boolean }) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const org = sheet.organization;
  const track = trackOf(data.deliverable.title, sheet.derivedFromSheetId);
  const mode =
    track === "derived"
      ? t.derived
      : fr.productionProducer.kinds[org.kind ?? "internal"].label;
  const who =
    org.kind === "external"
      ? (org.company?.name ?? "—")
      : (org.lineProducer?.name ?? data.ownerName ?? "—");
  const fiche = data.heritage.fiche;
  const last = facts.versions[0] ?? null;
  const gateOpen = !facts.source || facts.source.cutApproved;
  const depositOpen = gateOpen && (!last || SENT_BACK.includes(last.status));
  const inApp = org.kind !== "external" && (data.canOrganize || canReview);
  return (
    <>
      <CallFacts
        facts={[
          { label: t.facts.production, value: `${mode} · ${who}` },
          ...(fiche
            ? [
                {
                  label: t.facts.fiche,
                  value: t.facts.ficheValue(
                    fiche.version,
                    fiche.ratios.join(", ") || null,
                  ),
                },
              ]
            : []),
        ]}
      />
      {facts.source && !facts.source.cutApproved && (
        <ToneCallout tone="neutral">
          {t.gateWait(facts.source.title)}
        </ToneCallout>
      )}
      <LightVersions versions={facts.versions} />
      {last &&
      !SENT_BACK.includes(last.status) &&
      last.status !== "approved" &&
      canReview &&
      running(data) ? (
        <LightDecision
          projectId={projectId}
          versionId={last.id}
          number={last.number}
        />
      ) : depositOpen && inApp && running(data) && organizationId ? (
        <LightDepositForm
          place={{ kind: "app", projectId, sheetId: sheet.id, organizationId }}
          number={(last?.number ?? 0) + 1}
          image={track === "artwork"}
        />
      ) : null}
    </>
  );
}

/** « Contrôle technique » (proto lightBody control): what the code read
 * of a cover, then what a person checks, then the confirmation. */
export function LightControlStep({ projectId, data, facts }: Common) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const c = t.control;
  const track = trackOf(data.deliverable.title, sheet.derivedFromSheetId);
  const approved = facts.versions.find((v) => v.status === "approved") ?? null;
  const auto =
    track === "artwork" && approved
      ? coverChecks({
          width: approved.width,
          height: approved.height,
          mime: approved.file?.mime ?? null,
          bytes: approved.file?.bytes ?? null,
        })
      : [];
  const fiche = data.heritage.fiche;
  const points =
    track === "artwork"
      ? [...c.cover]
      : [
          ...(fiche?.ratios ?? []).map((r) => c.video.export(r)),
          c.video.duration,
          c.video.sound,
          ...(fiche?.subtitles ? [c.video.subtitles] : []),
          c.video.naming,
        ];
  const done = facts.delivery?.checkedAt ?? null;
  const allAuto = auto.every((a) => a.ok);
  return (
    <>
      {auto.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">{c.auto}</h3>
          <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
            {auto.map((a) => (
              <li
                key={a.key}
                className="flex items-center justify-between gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0"
              >
                <span className="flex flex-col">
                  <span>{c.rules[a.key]}</span>
                  <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                    {a.key === "square" && a.value === ""
                      ? a.ok
                        ? c.yes
                        : c.no
                      : a.value}
                  </span>
                </span>
                <StatusBadge size="sm" tone={a.ok ? "success" : "danger"}>
                  {a.ok ? c.conforming : c.notConforming}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}
      {done ? (
        <>
          <ul className="flex flex-col gap-1.5">
            {points.map((p) => (
              <li key={p} className="flex gap-2">
                <span
                  aria-hidden
                  className="text-[color:var(--tone-success-fg)]"
                >
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
          <ToneCallout tone="success">
            <span>
              <b className="font-semibold">{c.confirmed}</b>
              {c.done(
                facts.delivery?.checkedBy ?? "—",
                formatShortInstant(done),
              )}
            </span>
          </ToneCallout>
        </>
      ) : !approved ? (
        <p className="text-[color:var(--text-secondary)]">{c.waitVersion}</p>
      ) : !allAuto ? (
        <ToneCallout tone="danger">{c.bad}</ToneCallout>
      ) : data.canOrganize ? (
        <LightControlForm
          projectId={projectId}
          sheetId={sheet.id}
          points={points}
        />
      ) : null}
    </>
  );
}

/** « Livraison » (proto lightBody delivery): to whom, the version, then
 * « Confirmer la livraison »; once delivered, to whom and when. */
export function LightDeliveryStep({
  projectId,
  data,
  facts,
  viewerId,
  activations,
}: Common & {
  viewerId: string | null;
  // Who holds the Activations of the deliverable, when known.
  activations: { id: string; name: string } | null;
}) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const d = t.delivery;
  const r = t.recipients;
  const track = trackOf(data.deliverable.title, sheet.derivedFromSheetId);
  const approved = facts.versions.find((v) => v.status === "approved") ?? null;
  const delivered = facts.delivery?.deliveredAt ?? null;
  if (delivered)
    return (
      <ToneCallout tone="success">
        <span>
          <b className="font-semibold">{d.delivered}</b>
          {d.deliveredLine(
            formatShortInstant(delivered),
            facts.delivery?.deliveredBy ?? "—",
            facts.recipients
              .map((x) =>
                x.purpose ? `${x.name} · ${r.purposes[x.purpose]}` : x.name,
              )
              .join(", "),
          )}
        </span>
      </ToneCallout>
    );
  if (!facts.delivery?.checkedAt) return null;
  const owner =
    data.ownerPersonId && data.ownerName
      ? { id: data.ownerPersonId, name: data.ownerName }
      : null;
  const options = recipientOptions({
    distribution: track === "artwork" ? owner : null,
    activations,
    validation:
      sheet.creativeExt?.kind === "contact" ? sheet.creativeExt : null,
    members: data.members.map((m) => ({ id: m.personId, name: m.name })),
    labels: {
      distribution: r.purposes.distributionCover,
      activations: r.purposes.activations,
      validation: r.purposes.validation,
    },
  });
  return (
    <>
      {approved && (
        <CallFacts
          facts={[{ label: d.version, value: d.versionValue(approved.number) }]}
        />
      )}
      {data.ownerPersonId === viewerId && running(data) && (
        <DeliverForm
          projectId={projectId}
          sheetId={sheet.id}
          options={options}
          viewerId={viewerId}
          handOff
          formats={data.heritage.fiche?.ratios ?? []}
        />
      )}
    </>
  );
}

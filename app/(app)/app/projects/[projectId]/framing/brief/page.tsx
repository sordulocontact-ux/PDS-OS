import { notFound } from "next/navigation";

import { BriefActions } from "@/components/framing/guide/brief-actions";
import { BriefDirectionDecision } from "@/components/framing/brief/brief-direction-decision";
import { BriefOwnerStep } from "@/components/framing/brief/brief-owner-step";
import { BriefVersionDoc } from "@/components/framing/brief/brief-version-doc";
import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { BriefDocument } from "@/components/framing/intel/brief-document";
import {
  BriefCompare,
  defaultComparison,
} from "@/components/framing/intel/brief-compare";
import { BriefHistory } from "@/components/framing/intel/brief-history";
import { FramingReadiness } from "@/components/framing/intel/framing-readiness";
import { BriefRequestsSection } from "@/components/framing/requests/brief-requests-section";
import { Fold } from "@/components/ui/fold";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { routes } from "@/lib/auth/redirects";
import { briefFileName } from "@/lib/framing/brief-pdf";
import {
  blocksValidation,
  isOpenRequest,
} from "@/lib/framing/brief-request-view";
import { loadBriefRequests } from "@/lib/framing/brief-requests";
import {
  buildBriefSnapshot,
  snapshotMatches,
  snapshotOf,
} from "@/lib/framing/brief-snapshot";
import type { Dimension } from "@/lib/framing/dimensions";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import { framingReadiness } from "@/lib/framing/readiness";
import { fr } from "@/lib/i18n/fr";
import { briefVersionTone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

/**
 * Cadrage › Brief de cadrage (proto frBrief, ticket § 7 and § 8): every
 * version as a card, the latest open; the owner creates and sends it; the
 * direction validates it here, or asks for a change on the dimensions it
 * checks, which alone reopen. The detailed corrections, the comparison of
 * versions, the full document and its PDF stay, folded.
 */
export default async function FramingBriefPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/framing/brief">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const showAll = sp.demandes === "toutes";
  const compareParam = Number(
    Array.isArray(sp.comparer) ? sp.comparer[0] : sp.comparer,
  );
  const comparing = Number.isInteger(compareParam) && compareParam > 0;
  const [ctx, loadedRequests] = await Promise.all([
    framingJourneyContext(projectId),
    loadBriefRequests(projectId),
  ]);
  if (!ctx) notFound();
  const { k, assessment, stage, canEdit, access, project } = ctx;
  const t = fr.framingJourney.brief;
  const ti = fr.framingIntel;
  const requests = loadedRequests ?? [];
  const latest = k.briefs[0] ?? null;
  const live = buildBriefSnapshot(k);
  const stored = latest ? snapshotOf(latest.content) : null;
  const pending = k.framing.pendingValidation;
  const open = assessment.blocking.length + assessment.conflicts.length;
  const working = stage === "not_started" || stage === "in_progress";
  const validatorName = ctx.validator?.name ?? "—";
  const stepOf = (key: string) => ctx.steps.find((s) => s.key === key);
  // The owner sends the Cadrage: it is shown as the next version, open.
  const sending =
    stage !== "validated" &&
    latest?.state !== "sent" &&
    canEdit &&
    working &&
    open === 0;

  // What the step offers now (proto frBrief, in this order).
  let act: React.ReactNode = null;
  if (stage === "validated")
    act = (
      <>
        <ToneCallout tone="success">
          <span>
            <b>{t.validated}</b>{" "}
            {t.validatedBody(
              latest?.decidedByName ?? null,
              latest?.decided_at ? formatShortInstant(latest.decided_at) : "—",
            )}
          </span>
        </ToneCallout>
        {/* The direction, once it validated: who launches the plan. */}
        {!ctx.plan?.launchedAt && <StepWaiting step={stepOf("plan")} />}
      </>
    );
  else if (latest?.state === "sent")
    act =
      pending && pending.validatorPersonId === access.personId ? (
        <BriefDirectionDecision
          projectId={projectId}
          validationId={pending.id}
          openMandatory={requests.filter(blocksValidation).length}
        />
      ) : (
        <StepWaiting step={stepOf("brief")} />
      );
  else if (sending) {
    // The Cadrage as it will be sent, then one gesture that makes the
    // version and sends it (Sacha 28/10/2026, no « Créer le Brief »).
    const lastSent = k.briefs.find((b) => b.sent_at);
    const lastSnap = lastSent ? snapshotOf(lastSent.content) : null;
    act = (
      <BriefOwnerStep
        projectId={projectId}
        validatorName={validatorName}
        unchangedFrom={
          lastSent && lastSnap && snapshotMatches(lastSnap, live)
            ? lastSent.version
            : null
        }
      />
    );
  } else if (open > 0 && working)
    act = (
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.notYet(open)}
      </p>
    );

  // The versions the direction received, latest first; only the newest is
  // open (Sacha 28/10/2026: the previous ones folded). A draft never sent,
  // left from before the one gesture, is not a version anyone read.
  const sent = k.briefs.filter((b) => b.sent_at);
  const preview = sending && (
    <VersionCard
      key="next"
      defaultOpen
      title={t.versionTitle(
        // A draft left from before that still says the same is the one sent.
        latest?.state === "pending" && stored && snapshotMatches(stored, live)
          ? latest.version
          : (latest?.version ?? 0) + 1,
      )}
      status={{
        tone: briefVersionTone.pending,
        label: ti.brief.states.pending,
      }}
    >
      <BriefVersionDoc snapshot={live} />
    </VersionCard>
  );
  const cards = sent.map((b, index) => {
    const snap = snapshotOf(b.content);
    const state = (ti.brief.states as Record<string, string>)[b.state];
    return (
      <VersionCard
        key={b.id}
        defaultOpen={index === 0 && !sending}
        title={t.versionTitle(b.version)}
        status={{
          tone: briefVersionTone[b.state] ?? "neutral",
          label: state ?? b.state,
        }}
        meta={t.created(b.createdByName, formatShortInstant(b.created_at))}
      >
        {snap && (
          <BriefVersionDoc
            snapshot={snap}
            reopened={b.reopened_dimensions ?? []}
          />
        )}
        {b.change_comment && b.state === "changes_requested" && (
          <ToneCallout tone="warning">
            {t.returned(
              b.decidedByName ?? "—",
              b.change_comment,
              (b.reopened_dimensions ?? [])
                .map((d) => ti.dimensions[d as Dimension])
                .join(", "),
            )}
          </ToneCallout>
        )}
      </VersionCard>
    );
  });

  // Folded: what the feedback asked for (PROJ-UX-06, PROJ-BUG-04/05).
  const hrefWith = (change: { all?: boolean; compare?: number | null }) => {
    const query = new URLSearchParams();
    if (change.all ?? showAll) query.set("demandes", "toutes");
    const compare =
      change.compare === undefined
        ? comparing
          ? compareParam
          : null
        : change.compare;
    if (compare) query.set("comparer", String(compare));
    const q = query.toString();
    return `${routes.projectFramingBrief(projectId)}${q ? `?${q}` : ""}`;
  };
  const more = latest && stored && (
    <Fold summary={t.more} defaultOpen={showAll || comparing}>
      <FramingReadiness readiness={framingReadiness(assessment)} />
      <BriefRequestsSection
        projectId={projectId}
        requests={requests}
        versions={k.briefs}
        showAll={showAll}
        hrefOf={(all) => hrefWith({ all })}
        canAnswer={canEdit && working}
        viewerPersonId={access.personId}
      />
      <BriefCompare
        versions={k.briefs}
        shown={latest}
        against={comparing ? compareParam : defaultComparison(k.briefs, latest)}
        hrefOf={(version) => hrefWith({ compare: version })}
      />
      <BriefDocument
        snapshot={stored}
        requests={requests.filter(
          (r) =>
            isOpenRequest(r) ||
            r.briefId === latest.id ||
            r.resolvedBriefId === latest.id,
        )}
        eyebrow={<span>{t.versionTitle(latest.version)}</span>}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <BriefActions
          pdfHref={routes.projectFramingBriefPdf(projectId, latest.version)}
          fileName={briefFileName(project.title)}
        />
      </div>
      <BriefHistory versions={k.briefs} />
    </Fold>
  );

  return (
    <FramingStepFrame projectId={projectId} stepKey="brief">
      <div className="flex flex-col gap-4">
        {/* A Cadrage validated before the versions reads live. */}
        {!latest && stage === "validated" && (
          <>
            <ToneCallout tone="neutral">{ti.brief.legacy}</ToneCallout>
            <BriefVersionDoc snapshot={live} />
          </>
        )}
        {preview}
        {cards}
        {act}
        {more}
      </div>
    </FramingStepFrame>
  );
}

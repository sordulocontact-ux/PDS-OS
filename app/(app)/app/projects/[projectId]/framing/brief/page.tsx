import { notFound } from "next/navigation";

import { BriefActions } from "@/components/framing/guide/brief-actions";
import { BriefDocument } from "@/components/ui/brief-document";
import { BriefOwnerStep } from "@/components/framing/brief/brief-owner-step";
import { BriefReview } from "@/components/framing/brief/brief-review";
import { BriefVersionDoc } from "@/components/framing/brief/brief-version-doc";
import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { BriefRequestsSection } from "@/components/framing/requests/brief-requests-section";
import { Fold } from "@/components/ui/fold";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { briefFileName } from "@/lib/framing/brief-pdf";
import { blocksValidation } from "@/lib/framing/brief-request-view";
import { loadBriefRequests } from "@/lib/framing/brief-requests";
import {
  briefChanges,
  buildBriefSnapshot,
  snapshotMatches,
  snapshotOf,
  type BriefSnapshot,
} from "@/lib/framing/brief-snapshot";
import type { Dimension } from "@/lib/framing/dimensions";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import { fr } from "@/lib/i18n/fr";
import { briefVersionTone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

/**
 * Cadrage › Brief de cadrage (proto « Suite du Cadrage », Sacha 29/10/2026;
 * ticket § 7 and § 8): ONE document, the version to send or the last one
 * sent, with what changed since the one before; the gesture under it — the
 * owner sends it, the direction validates it or marks in it the dimensions
 * to review, which alone reopen. The previous versions are folded; the
 * detailed corrections show only when there are some.
 */
export default async function FramingBriefPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/framing/brief">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const showAll = sp.demandes === "toutes";
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
  const pending = k.framing.pendingValidation;
  const open = assessment.blocking.length + assessment.conflicts.length;
  const working = stage === "not_started" || stage === "in_progress";
  // The owner sends the Cadrage: it is shown as the next version.
  const sending =
    stage !== "validated" &&
    latest?.state !== "sent" &&
    canEdit &&
    working &&
    open === 0;

  // The versions the direction received, latest first. A draft never sent,
  // left from before the one gesture, is not a version anyone read.
  const sent = k.briefs.filter((b) => b.sent_at);
  const shownSent = sending ? null : (sent[0] ?? null);
  const before = shownSent ? sent[1] : sent[0];
  const beforeSnap = before ? snapshotOf(before.content) : null;
  const changesFrom = (snap: BriefSnapshot) => {
    if (!before || !beforeSnap) return null;
    const list = briefChanges(beforeSnap, snap);
    return list.length
      ? t.changedSince(
          before.version,
          list.map((c) => t.change(c.label, c.before, c.after)).join(" ; "),
        )
      : null;
  };

  let doc: React.ReactNode = null;
  if (sending) {
    const stored = latest ? snapshotOf(latest.content) : null;
    const changes = changesFrom(live);
    doc = (
      <BriefDocument
        title={t.versionTitle(
          // A draft left from before that still says the same is the one sent.
          latest?.state === "pending" && stored && snapshotMatches(stored, live)
            ? latest.version
            : (latest?.version ?? 0) + 1,
        )}
        meta={t.draftMeta}
        status={{
          tone: briefVersionTone.pending,
          label: ti.brief.states.pending,
        }}
        footer={
          <BriefOwnerStep
            projectId={projectId}
            validatorName={ctx.validator?.name ?? "—"}
            unchangedFrom={
              before && beforeSnap && snapshotMatches(beforeSnap, live)
                ? before.version
                : null
            }
          />
        }
        changes={changes}
      >
        <BriefVersionDoc snapshot={live} />
      </BriefDocument>
    );
  } else if (shownSent) {
    const snap = snapshotOf(shownSent.content);
    const state = (ti.brief.states as Record<string, string>)[shownSent.state];
    const created = t.created(
      shownSent.createdByName,
      formatShortInstant(shownSent.created_at),
    );
    const card = {
      title: t.versionTitle(shownSent.version),
      meta:
        shownSent.state === "approved" && shownSent.decided_at
          ? `${created} · ${t.validatedMeta(shownSent.decidedByName, formatShortInstant(shownSent.decided_at))}`
          : created,
      status: {
        tone: briefVersionTone[shownSent.state] ?? "neutral",
        label: state ?? shownSent.state,
      },
      actions: (
        <BriefActions
          projectId={projectId}
          pdfHref={routes.projectFramingBriefPdf(projectId, shownSent.version)}
          fileName={briefFileName(project.title)}
          // The public link is made by those who send and validate it.
          canShare={canEdit || can(access, "validate")}
        />
      ),
      changes: snap ? changesFrom(snap) : null,
    };
    const decides =
      shownSent.state === "sent" &&
      pending &&
      pending.validatorPersonId === access.personId;
    doc =
      snap &&
      (decides ? (
        <BriefReview
          projectId={projectId}
          validationId={pending.id}
          openMandatory={requests.filter(blocksValidation).length}
          snapshot={snap}
          card={card}
        />
      ) : (
        <BriefDocument
          title={card.title}
          meta={card.meta}
          status={card.status}
          actions={card.actions}
          changes={card.changes}
        >
          <BriefVersionDoc
            snapshot={snap}
            reopened={
              shownSent.state === "changes_requested"
                ? (shownSent.reopened_dimensions ?? [])
                : []
            }
          />
        </BriefDocument>
      ));
  }

  // Every version but the one shown, folded, with the direction's return.
  const older = sent.filter((b) => b !== shownSent);
  const previous = older.length > 0 && (
    <Fold summary={t.previous(older.length)}>
      <ul className="flex flex-col gap-2">
        {older.map((b) => (
          <li
            key={b.id}
            className="flex flex-col gap-1 rounded-lg border border-[color:var(--border-hairline)] bg-card px-3.5 py-3 text-body-sm modern:px-3"
          >
            <span>
              <span className="font-semibold">{t.versionTitle(b.version)}</span>
              <span className="text-[color:var(--text-secondary)]">
                {" · "}
                {(ti.brief.states as Record<string, string>)[b.state] ??
                  b.state}
                {" · "}
                {t.created(b.createdByName, formatShortInstant(b.created_at))}
              </span>
            </span>
            {b.change_comment && (
              <span className="text-caption text-[color:var(--text-secondary)]">
                {t.returned(
                  b.decidedByName ?? "—",
                  b.change_comment,
                  (b.reopened_dimensions ?? [])
                    .map((d) => ti.dimensions[d as Dimension])
                    .join(", "),
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
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
        {!doc && open > 0 && working && (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {t.notYet(open)}
          </p>
        )}
        {doc}
        <BriefRequestsSection
          projectId={projectId}
          requests={requests}
          versions={k.briefs}
          showAll={showAll}
          hrefOf={(all) =>
            `${routes.projectFramingBrief(projectId)}${all ? "?demandes=toutes" : ""}`
          }
          canAnswer={canEdit && working}
          viewerPersonId={access.personId}
        />
        {previous}
      </div>
    </FramingStepFrame>
  );
}

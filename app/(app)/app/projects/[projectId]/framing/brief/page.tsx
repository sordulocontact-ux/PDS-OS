import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck, IconPenWriting2 } from "nucleo-sharp-essential";

import { BriefActions } from "@/components/framing/guide/brief-actions";
import { BriefDocument } from "@/components/framing/intel/brief-document";
import {
  BriefOwnerActions,
  BriefValidatorActions,
} from "@/components/framing/intel/brief-decision";
import {
  BriefCompare,
  defaultComparison,
} from "@/components/framing/intel/brief-compare";
import { BriefHistory } from "@/components/framing/intel/brief-history";
import { FramingReadiness } from "@/components/framing/intel/framing-readiness";
import { BriefRequestsSection } from "@/components/framing/requests/brief-requests-section";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { assessFraming } from "@/lib/framing/assess";
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
import { framingReadiness } from "@/lib/framing/readiness";
import type { Dimension } from "@/lib/framing/dimensions";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { briefVersionTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The Brief de cadrage (ticket § 7 and § 8): its latest version as it was
 * written, its state, the owner's and the validator's moves, and every
 * version before it. The source of truth of the Cadrage once validated.
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
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [k, loadedRequests] = await Promise.all([
    loadFramingKnowledge(projectId, access),
    loadBriefRequests(projectId),
  ]);
  if (!k) notFound();
  const requests = loadedRequests ?? [];
  // The page's URL with its filter and comparison, one changed at a time.
  const hrefWith = (change: { all?: boolean; compare?: number | null }) => {
    const params = new URLSearchParams();
    if (change.all ?? showAll) params.set("demandes", "toutes");
    const compare =
      change.compare === undefined
        ? Number.isInteger(compareParam) && compareParam > 0
          ? compareParam
          : null
        : change.compare;
    if (compare) params.set("comparer", String(compare));
    const query = params.toString();
    return `${routes.projectFramingBrief(projectId)}${query ? `?${query}` : ""}`;
  };
  const t = fr.framingIntel;
  const canEdit = canEditProject(access, project);
  const stage = k.framing.stage?.state ?? "not_started";
  const latest = k.briefs[0] ?? null;
  const stored = latest ? snapshotOf(latest.content) : null;
  const live = buildBriefSnapshot(k);
  const pending = k.framing.pendingValidation;

  const tools = (
    <div className="flex flex-wrap justify-end gap-2">
      <BriefActions
        pdfHref={routes.projectFramingBriefPdf(projectId, latest?.version)}
        fileName={briefFileName(project.title)}
      />
    </div>
  );

  // No version yet: a Cadrage validated before versions reads live.
  if (!latest || !stored) {
    if (stage === "validated")
      return (
        <div className="flex flex-col gap-4">
          <ToneCallout tone="neutral">{t.brief.legacy}</ToneCallout>
          <BriefDocument
            snapshot={live}
            eyebrow={
              <StatusBadge tone="success" size="sm">
                {t.brief.states.approved}
              </StatusBadge>
            }
          />
          {tools}
        </div>
      );
    return (
      <EmptyState
        icon={IconPenWriting2}
        title={t.brief.emptyTitle}
        body={t.brief.emptyBody}
        action={
          <Link
            href={routes.projectFramingStep(projectId, "brief")}
            className={buttonVariants({ size: "lg" })}
          >
            {t.brief.toFraming}
          </Link>
        }
      />
    );
  }

  const outdated = latest.state === "pending" && !snapshotMatches(stored, live);
  const isValidator =
    latest.state === "sent" && pending?.validatorPersonId === access.personId;
  const request = k.briefs.find((b) => b.change_comment);
  const openRequests = requests.filter(isOpenRequest);
  // The last version sent before this one, when this one says the same thing
  // (PROJ-BUG-05): sending it again asks why.
  const lastSent = k.briefs.find(
    (b) => b.version < latest.version && b.sent_at,
  );
  const lastSentSnapshot = lastSent ? snapshotOf(lastSent.content) : null;
  const unchangedFrom =
    lastSent && lastSentSnapshot && snapshotMatches(lastSentSnapshot, stored)
      ? lastSent.version
      : null;
  const against =
    Number.isInteger(compareParam) && compareParam > 0
      ? compareParam
      : defaultComparison(k.briefs, latest);
  const working =
    canEdit && (stage === "not_started" || stage === "in_progress");
  // Shown in the document: what is open, and what was asked on or answered
  // by this version.
  const inPlace = requests.filter(
    (r) =>
      isOpenRequest(r) ||
      r.briefId === latest.id ||
      r.resolvedBriefId === latest.id,
  );

  return (
    <div className="flex flex-col gap-6">
      {latest.state === "approved" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--tone-success-bg)] px-5 py-4 text-[color:var(--tone-success-fg)]">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-md font-semibold">
            <span className="flex items-center gap-2">
              <IconCheck aria-hidden className="size-4" />
              {t.entry.validated}
            </span>
            <span className="flex items-center gap-2">
              <IconCheck aria-hidden className="size-4" />
              {t.entry.framingDone}
            </span>
          </p>
          <Link
            href={routes.projectPlan(projectId)}
            className={buttonVariants({ size: "sm" })}
          >
            {t.entry.seePlan}
          </Link>
        </div>
      )}
      {openRequests.length > 0 ? (
        <ToneCallout tone="danger">
          <span className="font-semibold">
            {fr.briefRequests.callout(openRequests.length)}
          </span>{" "}
          {fr.briefRequests.calloutBody}
        </ToneCallout>
      ) : (
        latest.state === "changes_requested" &&
        request?.change_comment && (
          <ToneCallout tone="danger">
            {t.guide.correction(
              request.change_comment,
              (latest.reopened_dimensions ?? [])
                .map((d) => t.dimensions[d as Dimension])
                .join(", "),
            )}
          </ToneCallout>
        )
      )}
      {outdated && <ToneCallout tone="warning">{t.brief.outdated}</ToneCallout>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-muted-foreground">
          {latest.state === "pending"
            ? t.brief.notSent
            : latest.state === "sent" && pending
              ? isValidator
                ? t.brief.youDecide
                : t.brief.waitingFor(pending.validatorName)
              : latest.sent_at && pending
                ? t.brief.sentTo(
                    pending.validatorName,
                    dateFormat.format(new Date(latest.sent_at)),
                  )
                : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {canEdit && latest.state === "pending" && stage === "in_progress" && (
            <BriefOwnerActions
              projectId={projectId}
              briefId={latest.id}
              outdated={outdated}
              unchangedFrom={unchangedFrom}
            />
          )}
          {canEdit && latest.state === "changes_requested" && (
            <Link
              href={routes.projectFraming(projectId)}
              className={buttonVariants({ size: "lg" })}
            >
              {t.brief.toFraming}
            </Link>
          )}
          {isValidator && pending && (
            <BriefValidatorActions
              projectId={projectId}
              validationId={pending.id}
              openMandatory={requests.filter(blocksValidation).length}
            />
          )}
        </div>
      </div>

      <FramingReadiness readiness={framingReadiness(assessFraming(k))} />
      <BriefRequestsSection
        projectId={projectId}
        requests={requests}
        versions={k.briefs}
        showAll={showAll}
        hrefOf={(all) => hrefWith({ all })}
        canAnswer={working}
        viewerPersonId={access.personId}
      />
      <BriefCompare
        versions={k.briefs}
        shown={latest}
        against={against}
        hrefOf={(version) => hrefWith({ compare: version })}
      />
      <BriefDocument
        snapshot={stored}
        requests={inPlace}
        eyebrow={
          <>
            <span>{t.brief.title}</span>
            <span aria-hidden>·</span>
            <span>{t.brief.version(latest.version)}</span>
            <StatusBadge
              tone={briefVersionTone[latest.state] ?? "neutral"}
              size="sm"
            >
              {(t.brief.states as Record<string, string>)[latest.state] ??
                latest.state}
            </StatusBadge>
          </>
        }
      />
      {tools}
      <BriefHistory versions={k.briefs} />
    </div>
  );
}

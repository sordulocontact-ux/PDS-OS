import { notFound } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { VersionCard } from "@/components/design/direction/version-card";
import { SheetVersionCard } from "@/components/design/sheets/sheet-version-card";
import { WithdrawRequestButton } from "@/components/design/withdraw-request-button";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { delegatedTo, loadDesignRoles } from "@/lib/design/delegations";
import { loadDirection } from "@/lib/design/direction";
import { loadSheetsPage } from "@/lib/design/sheets-page";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { designReviewTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionRequests.statuses.pending} · ${fr.app.name}`,
};

/**
 * One validation request of the Conception (MKT-C2-11), where its
 * notification and the Travail lead: the frozen content of the version,
 * who asked and when, the message, the date expected, who decides, and the
 * controls of a validator — warned when what was sent changed since. The
 * requester (or the owner) may withdraw it while it waits.
 */
export default async function DesignDecisionPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/decisions/[submissionId]">) {
  const { projectId, submissionId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const supabase = await createClient();
  const [{ data: request }, { data: current }] = await Promise.all([
    supabase
      .from("design_submissions")
      .select(
        "id, kind, sheet_id, number, status, message, due_on, submitted_by, submitted_at",
      )
      .eq("id", submissionId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase.rpc("design_submission_is_current", {
      p_submission_id: submissionId,
    }),
  ]);
  if (!request) notFound();
  const page = await loadSheetsPage(
    project,
    access,
    request.sheet_id ?? undefined,
  );
  if (!page) notFound();
  const { data, people, sheets } = page;
  const roles = await loadDesignRoles(projectId, people.members);
  const me = access.personId;
  const t = fr.conceptionRequests;
  const names = new Map(people.members.map((m) => [m.personId, m.name]));
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "") : "");
  const isSheet = request.kind === "sheet" && request.sheet_id;
  const scope = isSheet
    ? (people.sheets[request.sheet_id!] ?? {
        responsible: null,
        validators: [],
      })
    : people.direction;
  const isValidator =
    scope.validators.some((v) => v.personId === me) ||
    delegatedTo(
      roles,
      me,
      isSheet ? "sheet" : "direction",
      isSheet ? request.sheet_id : null,
      "validator",
    );
  const selfSubmitted = request.submitted_by === me && !roles.allowSelfApproval;
  const pending = request.status === "pending";
  const outdated = pending && current === false;
  const sheet = isSheet ? sheets[0] : null;
  const object = sheet ? t.sheetObject(sheet.sheet.title) : t.directionObject;
  const status = (
    request.status in t.statuses ? request.status : "pending"
  ) as keyof typeof t.statuses;

  let content: React.ReactNode = null;
  if (sheet) {
    const version = sheet.versions.find((v) => v.id === submissionId);
    if (!version) notFound();
    content = (
      <SheetVersionCard
        projectId={projectId}
        version={version}
        nameOf={nameOf}
        isValidator={isValidator && !selfSubmitted && !outdated}
        selfSubmitted={isValidator && selfSubmitted}
        open
      />
    );
  } else {
    const direction = await loadDirection(projectId, people.members);
    const submission = direction.submissions.find((s) => s.id === submissionId);
    if (!submission) notFound();
    content = (
      <VersionCard
        projectId={projectId}
        submission={submission}
        isValidator={isValidator && !outdated}
        selfSubmitted={selfSubmitted}
        open
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 pt-6">
      <ConceptionTabs projectId={projectId} />
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-display-sm font-semibold break-words">
            {t.pageTitle(object, request.number)}
          </h2>
          <StatusBadge tone={designReviewTone[status] ?? "neutral"}>
            {t.statuses[status]}
          </StatusBadge>
        </div>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.pageIntro}
        </p>
        <div className="flex flex-col gap-1 text-caption text-muted-foreground">
          <span>
            {t.requestedBy(nameOf(request.submitted_by), "")}
            <Timestamp iso={request.submitted_at} />
          </span>
          {request.due_on && (
            <span>{t.dueLabel(formatBriefDate(request.due_on))}</span>
          )}
          <span>
            {t.validatorsLabel(scope.validators.map((v) => v.name).join(", "))}
          </span>
        </div>
        {request.message && (
          <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
            <span className="text-caption text-muted-foreground">
              {t.messageLabel}
            </span>
            <p className="text-body-md whitespace-pre-wrap">
              {request.message}
            </p>
          </div>
        )}
        {outdated && <ToneCallout tone="warning">{t.outdated}</ToneCallout>}
        <div className="flex flex-wrap gap-2">
          <ViewLink
            href={
              sheet
                ? routes.projectDesignSheet(projectId, sheet.sheet.id)
                : routes.projectDesignDirection(projectId)
            }
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t.backToObject}
          </ViewLink>
          {pending && (request.submitted_by === me || data.isOwner) && (
            <WithdrawRequestButton
              projectId={projectId}
              submissionId={submissionId}
            />
          )}
        </div>
      </header>
      {content}
    </div>
  );
}

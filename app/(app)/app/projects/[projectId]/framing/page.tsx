import { notFound } from "next/navigation";

import { FramingDictation } from "@/components/framing/framing-dictation";
import { BriefReady } from "@/components/framing/intel/brief-ready";
import {
  CallReview,
  type ReviewRow,
} from "@/components/framing/intel/call-review";
import { ConstraintLines } from "@/components/framing/intel/constraint-lines";
import { DeadlineLines } from "@/components/framing/intel/deadline-lines";
import { DimensionNav } from "@/components/framing/intel/dimension-nav";
import { FramingCallSheet } from "@/components/framing/intel/framing-call-sheet";
import { FramingEntry } from "@/components/framing/intel/framing-entry";
import { FramingProgress } from "@/components/framing/intel/framing-progress";
import { KnownAnswers } from "@/components/framing/intel/known-answers";
import { NeedsLines } from "@/components/framing/intel/needs-lines";
import { QuestionScreen } from "@/components/framing/intel/question-screen";
import { TeamLines } from "@/components/framing/intel/team-lines";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { editableDimensions } from "@/lib/framing/analyse";
import {
  assessFraming,
  nextAfter,
  rolesContext,
  type QuestionState,
} from "@/lib/framing/assess";
import { linesOf } from "@/lib/framing/brief-snapshot";
import { callSheetData } from "@/lib/framing/call-sheet-data";
import {
  DIMENSIONS,
  QUESTIONS,
  isDimension,
  isQuestionKey,
  type Dimension,
} from "@/lib/framing/dimensions";
import type { HelpSuggestion } from "@/lib/framing/help";
import { framingStarted, loadFramingKnowledge } from "@/lib/framing/knowledge";
import { isFramingOpen } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The Cadrage intelligent (docs/ARCHITECTURE.md § 6): the six dimensions,
 * one question at a time, adapted to what the project already knows; the
 * review of a framing call; the way to the Brief. The screen is in the URL
 * (?step=<dimension>&q=<question>, ?step=review&call=…, ?step=brief).
 */
export default async function FramingPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/framing">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const step = first(sp.step);
  const [access, project, framingOpen] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isFramingOpen(projectId),
  ]);
  const canEdit = canEditProject(access, project);
  const k = await loadFramingKnowledge(projectId, access);
  if (!k) notFound();
  const assessment = assessFraming(k);
  const sheet = callSheetData(k, assessment);

  if (!framingOpen || (canEdit && !framingStarted(k)))
    return (
      <FramingEntry
        projectId={projectId}
        assessment={assessment}
        acceptedAt={k.acceptedAt}
        ownerName={project.ownerName}
        started={false}
        canEdit={canEdit}
        callSheet={sheet}
      />
    );

  const t = fr.framingIntel;
  const stage = k.framing.stage?.state ?? "not_started";
  const open = editableDimensions(k);
  const editableIn = (d: Dimension) =>
    canEdit && (stage === "not_started" || stage === "in_progress") && open(d);

  const briefHref = routes.projectFramingStep(projectId, "brief");
  const dimensionHref = (d: Dimension) =>
    routes.projectFramingStep(projectId, d);
  const questionHref = (q: QuestionState) =>
    routes.projectFramingQuestion(projectId, q.dimension, q.key);
  const nextHrefOf = (q: QuestionState) => {
    const next = nextAfter(assessment, q.key);
    return next ? questionHref(next) : briefHref;
  };

  // A correction: the validator's comment and what it reopened.
  const latest = k.briefs[0];
  const request = k.briefs.find((b) => b.change_comment);
  const reopened =
    latest &&
    (latest.state === "pending" || latest.state === "changes_requested") &&
    latest.reopened_dimensions
      ? latest.reopened_dimensions
      : null;

  const view: Dimension | "review" | "brief" =
    step === "review" || step === "brief"
      ? step
      : isDimension(step)
        ? step
        : (assessment.next?.dimension ?? "brief");

  const navItems = [
    ...assessment.dimensions.map((d, index) => ({
      key: d.dimension,
      href: dimensionHref(d.dimension),
      title: `${t.dimensionNumber(index)} ${t.dimensions[d.dimension]}`,
      line: t.dimensionLine(
        d.counts.known,
        d.counts.to_confirm,
        d.counts.missing,
      ),
      status: d.status,
    })),
    { key: "brief", href: briefHref, title: t.guide.briefNav },
  ];

  const lines = Object.fromEntries(
    Object.keys(QUESTIONS).map((key) => [key, linesOf(key, k)]),
  );

  let screen: React.ReactNode;
  if (view === "review") {
    const callId = first(sp.call);
    const call = k.calls.find((c) => c.callId === callId);
    if (!call) notFound();
    const fromCall = (q: QuestionState) => {
      if (q.provenance?.kind === "call" && q.provenance.callId === call.callId)
        return true;
      const rows =
        q.key === "needs"
          ? k.framing.needs
          : q.key === "constraints" || q.key === "legal_blockers"
            ? k.framing.constraints.filter((c) =>
                q.key === "legal_blockers"
                  ? c.type === "rights"
                  : c.type !== "rights",
              )
            : q.key === "contributors"
              ? k.framing.team
              : q.key === "deadlines"
                ? k.deadlines
                : [];
      return rows.some(
        (r) =>
          r.review_status === "proposed" &&
          r.provenance?.kind === "call" &&
          r.provenance.callId === call.callId,
      );
    };
    const rows: ReviewRow[] = assessment.dimensions.flatMap((d) =>
      d.questions.map((q) => ({
        key: q.key,
        dimension: d.dimension,
        label: t.questions[q.key].label,
        status: q.status,
        value: (() => {
          const all = linesOf(q.key, k, { proposed: true });
          return all.length ? all.join(" · ") : q.display;
        })(),
        quote: q.provenance?.quote ?? null,
        fromCall: fromCall(q),
        href: questionHref(q),
      })),
    );
    screen = (
      <CallReview
        projectId={projectId}
        callTitle={call.title}
        rows={rows}
        editable={
          canEdit && (stage === "not_started" || stage === "in_progress")
        }
        guideHref={routes.projectFraming(projectId)}
      />
    );
  } else if (view === "brief") {
    screen = (
      <BriefReady
        projectId={projectId}
        remaining={assessment.blocking.map((q) => ({
          key: q.key,
          label: `${t.dimensions[q.dimension]} · ${t.questions[q.key].label} · ${t.statuses[q.status].toLowerCase()}`,
          href: questionHref(q),
        }))}
        editable={
          canEdit && (stage === "not_started" || stage === "in_progress")
        }
        hasBrief={k.briefs.length > 0}
        briefHref={routes.projectFramingBrief(projectId)}
      />
    );
  } else {
    const dimension = assessment.dimensions.find((d) => d.dimension === view)!;
    const index = DIMENSIONS.indexOf(view);
    const asked = first(sp.q);
    const question =
      (isQuestionKey(asked) &&
        dimension.questions.find((q) => q.key === asked)) ||
      dimension.questions.find(
        (q) =>
          q.status !== "known" && !(q.dismissed && !QUESTIONS[q.key].required),
      ) ||
      null;
    const editable = editableIn(view);
    const position = question ? dimension.questions.indexOf(question) + 1 : 0;
    const eyebrow = `${t.guide.eyebrow(t.dimensionNumber(index), t.dimensions[view])} · ${t.questionOf(position, dimension.questions.length)}`;
    const suggestionsRow = question
      ? k.framing.briefRows.find(
          (r) =>
            r.field_key === `${question.key}_suggestions` &&
            r.status === "proposed",
        )
      : undefined;
    const suggestions = ((
      suggestionsRow?.value as { items?: HelpSuggestion[] } | null
    )?.items ?? []) as HelpSuggestion[];
    const timingSaid =
      k.framing.fields.find((f) => f.key === "timing")?.value ?? null;

    const body = (() => {
      if (!question) return null;
      const nextHref = nextHrefOf(question);
      const common = { projectId, editable, nextHref };
      switch (QUESTIONS[question.key].kind) {
        case "needs":
          return (
            <NeedsLines
              key={k.framing.needs
                .map((n) => `${n.id}:${n.review_status}`)
                .join()}
              needs={k.framing.needs}
              {...common}
            />
          );
        case "constraints":
          return (
            <ConstraintLines
              constraints={k.framing.constraints}
              scope="budget"
              {...common}
            />
          );
        case "rights":
          return (
            <ConstraintLines
              constraints={k.framing.constraints}
              scope="legal"
              {...common}
            />
          );
        case "deadlines":
          return <DeadlineLines deadlines={k.deadlines} {...common} />;
        case "team":
          return (
            <TeamLines
              team={k.framing.team}
              needs={k.framing.needs}
              music={rolesContext(k).music}
              creatives={k.creatives}
              engineers={k.engineers}
              {...common}
            />
          );
        default:
          return null;
      }
    })();

    screen = (
      <div className="flex min-w-0 flex-col gap-8">
        {question ? (
          <QuestionScreen
            key={`${question.key}-${question.status}-${question.display ?? ""}`}
            projectId={projectId}
            question={question}
            eyebrow={eyebrow}
            editable={editable}
            nextHref={nextHrefOf(question)}
            suggestions={suggestions}
            hint={
              question.key === "target_date" && timingSaid
                ? t.sources.timingSaid(timingSaid)
                : null
            }
          >
            {body}
          </QuestionScreen>
        ) : (
          <ToneCallout tone="success">{t.guide.dimensionDone}</ToneCallout>
        )}
        {canEdit &&
          !editable &&
          (stage === "not_started" || stage === "in_progress") && (
            <ToneCallout tone="neutral">{t.guide.locked}</ToneCallout>
          )}
        <KnownAnswers
          projectId={projectId}
          dimension={dimension}
          lines={lines}
          current={question?.key ?? null}
          editable={editable}
        />
      </div>
    );
  }

  const working =
    canEdit && (stage === "not_started" || stage === "in_progress");
  const toolbar = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1 basis-64">
        <FramingProgress
          known={assessment.counts.known}
          total={assessment.total}
        />
      </div>
      {working && <FramingCallSheet projectId={projectId} data={sheet} />}
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
      {reopened && request?.change_comment && (
        <ToneCallout tone="warning">
          {t.guide.correction(
            request.change_comment,
            reopened.map((d) => t.dimensions[d as Dimension]).join(", "),
          )}
        </ToneCallout>
      )}
      {working && !reopened ? (
        // The dictation's button sits on the progress row, its panel below.
        <FramingDictation projectId={projectId}>{toolbar}</FramingDictation>
      ) : (
        toolbar
      )}
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <DimensionNav
          items={navItems}
          current={view}
          label={t.dimensionsLabel}
        />
        {screen}
      </div>
    </div>
  );
}

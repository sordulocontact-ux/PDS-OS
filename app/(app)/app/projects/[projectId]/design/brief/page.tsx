import { notFound } from "next/navigation";

import { DesignStepFrame } from "@/components/design/design-step-frame";
import { EstablishBriefButton } from "@/components/design/brief-step/establish-brief-button";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PoCallout } from "@/components/ui/po-callout";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { liveCreativeBrief } from "@/lib/design/brief-live";
import { sameBrief } from "@/lib/design/brief-store";
import { designJourneyContext } from "@/lib/design/journey-context";
import { loadSheetViews } from "@/lib/design/sheet-views";
import { fr } from "@/lib/i18n/fr";
import { isLocked } from "@/lib/ui/journey";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.designSteps.brief;

/**
 * Conception › Brief créatif (proto deB, ticket § 8): the common frame of
 * every deliverable, assembled by code from what is validated — never
 * written by the model — then « Établir le Brief créatif V1 » (versioned,
 * its PDF). Its open points are the sheets' empty required fields: it can
 * be established before the sheets are complete.
 */
export default async function DesignBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/brief">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const step = ctx.steps[4];
  const [live, views] = await Promise.all([
    liveCreativeBrief(projectId, ctx.access),
    loadSheetViews(ctx),
  ]);
  const stored = ctx.briefs[0] ?? null;
  const c = stored?.content ?? live?.content;
  const number = stored ? stored.number : 1;
  const outdated = Boolean(
    stored && live && !sameBrief(stored.content, live.content),
  );
  const join = (list: string[]) => (list.length ? list.join(" · ") : "—");
  const open = views.flatMap((v) =>
    v.missing.map((m) => `${v.facts.sheet.title} : ${m}`),
  );
  const validated = ctx.data.references.length
    ? (c?.references ?? []).map((r) => r.label)
    : [];
  const canEstablish =
    (ctx.isCreative || ctx.isOwner) && !isLocked(step.status);

  const facts: Array<{
    label: string;
    value: string;
    state?: { tone: "warning"; label: string };
  }> = c
    ? [
        {
          label: t.rows.context,
          value: t.contextValue(
            [c.context.project, c.context.artist].filter(Boolean).join(" · "),
            c.context.releaseDate ? formatDay(c.context.releaseDate) : null,
            ctx.start.strategy?.version ?? null,
          ),
        },
        // A collective whose main artist changed: the identity kept is
        // said not to match it any more, never replaced in silence.
        ...(c.identity?.mismatchArtist !== undefined
          ? [
              {
                label: t.rows.identity,
                value: fr.conceptionDirection.brief.identity.mismatch(
                  c.identity.mismatchArtist,
                ),
                state: { tone: "warning" as const, label: t.identityToCheck },
              },
            ]
          : []),
        { label: t.rows.goals, value: c.objectives.strategic ?? "—" },
        { label: t.rows.audiences, value: c.audiences.audiences ?? "—" },
        {
          label: t.rows.narrative,
          value:
            c.narrative.angle ?? join(c.narrative.parts.map((p) => p.value)),
        },
        { label: t.rows.principles, value: join(c.principles) },
        { label: t.rows.tone, value: join(c.tone) },
        { label: t.rows.avoid, value: join(c.showAvoid) },
        {
          label: t.rows.deliverables,
          value: c.deliverables.map((d) => d.title).join(", ") || "—",
        },
        {
          label: t.rows.references,
          value: `${validated.length} · ${join(validated)}`,
        },
        {
          label: t.rows.open,
          value: open.length ? open.join(" · ") : t.none,
        },
      ]
    : [];

  return (
    <DesignStepFrame
      projectId={projectId}
      stepKey="brief"
      po={stored ? undefined : <PoCallout>{t.po}</PoCallout>}
    >
      {stored && (
        <ToneCallout tone="success">
          {t.established(
            stored.number,
            ctx.nameOf(stored.createdBy) || "—",
            formatShortInstant(stored.createdAt),
          )}
        </ToneCallout>
      )}
      {outdated && (
        <ToneCallout tone="warning">{t.outdated(number)}</ToneCallout>
      )}
      {c && (
        <DocumentCard
          name={t.title(number)}
          action={
            stored && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={routes.projectDesignBriefPdf(
                      projectId,
                      stored.number,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                {t.pdf}
              </Button>
            )
          }
        >
          <FactRows className="rounded-none border-0">
            {facts.map((f) => (
              <FactRow
                key={f.label}
                label={f.label}
                value={f.value}
                state={f.state}
              />
            ))}
          </FactRows>
        </DocumentCard>
      )}
      {canEstablish && (!stored || outdated) ? (
        <EstablishBriefButton
          projectId={projectId}
          label={fr.designJourney.todo.brief(stored ? stored.number + 1 : 1)}
          done={t.establishedDone(stored ? stored.number + 1 : 1)}
        />
      ) : (
        <StepWaiting step={step} />
      )}
    </DesignStepFrame>
  );
}

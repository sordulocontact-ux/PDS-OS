import { ProposeSplitButton } from "@/components/legal/splits/split-actions";
import { SplitLines } from "@/components/legal/splits/split-lines";
import { SplitLinks } from "@/components/legal/splits/split-links";
import { SplitVersionChanges } from "@/components/legal/splits/split-version-changes";
import { NextCard } from "@/components/ui/next-card";
import { SplitEditorInline } from "@/components/legal/tracking/split-editor-inline";
import { EmptyNote } from "@/components/shell/empty-state";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { SplitVersionView, TitleSplit } from "@/lib/legal/splits/queries";

/**
 * One title's split in the plan's panel (the prototype's): the parts to
 * propose (« Parts égales », exactly 100 %), sent for confirmation — one
 * link per person, shown once — then each answer; a dispute asks for a new
 * version, nothing is erased. Ticket Juridique 04.
 */
export function SplitPanel({
  projectId,
  split,
}: {
  projectId: string;
  split: TitleSplit;
}) {
  const t = fr.legal.panels.split;
  const page = fr.legalSplits.page;
  const { active, draft } = split;
  // JUR-29: a version against the one it follows.
  const before = (v: SplitVersionView) =>
    [...(active ? [active] : []), ...split.history]
      .filter((x) => x.version < v.version)
      .sort((a, b) => b.version - a.version)[0];
  const changes = (v: SplitVersionView) => {
    const previous = before(v);
    return previous ? (
      <SplitVersionChanges previous={previous} version={v} />
    ) : null;
  };

  if (draft)
    return (
      <NextCard kind="act" label={t.next} title={t.send}>
        <p className="text-sm text-muted-foreground">{t.sendBody}</p>
        {changes(draft)}
        <SplitLines
          projectId={projectId}
          title={split.title}
          lines={draft.lines}
          open={false}
        />
        <ProposeSplitButton
          projectId={projectId}
          target={{ versionId: draft.id }}
          title={split.title}
        />
        <SplitEditorInline
          projectId={projectId}
          masterId={split.masterId}
          initial={draft.lines}
          withNote={Boolean(active)}
          startOpen={false}
          label={page.resume}
        />
      </NextCard>
    );

  if (!active) {
    if (split.proposal.length === 0)
      return <EmptyNote>{page.noCreators}</EmptyNote>;
    if (split.fromTitle)
      return (
        <NextCard kind="act" label={t.next} title={t.fromTitle}>
          <p className="text-sm text-muted-foreground">{page.fromTitle}</p>
          <SplitLines
            projectId={projectId}
            title={split.title}
            lines={split.proposal}
            open={false}
          />
          <ProposeSplitButton
            projectId={projectId}
            target={{ masterId: split.masterId }}
            title={split.title}
          />
          <SplitEditorInline
            projectId={projectId}
            masterId={split.masterId}
            initial={split.proposal}
            withNote={false}
            startOpen={false}
            label={page.editFirst}
          />
        </NextCard>
      );
    return (
      <NextCard kind="act" label={t.next} title={t.propose}>
        <p className="text-sm text-muted-foreground">{t.proposeBody}</p>
        <SplitEditorInline
          projectId={projectId}
          masterId={split.masterId}
          initial={split.proposal}
          withNote={false}
          startOpen
          label={page.prepare}
        />
      </NextCard>
    );
  }

  const confirmed = active.lines.filter(
    (line) => line.confirmation.state === "confirmed",
  ).length;
  const disputes = active.lines.filter(
    (line) =>
      line.confirmation.state === "disputed" && line.confirmation.comment,
  );
  const lines = (
    <>
      {changes(active)}
      <SplitLines
        projectId={projectId}
        title={split.title}
        lines={active.lines}
        open={active.status !== "confirmed"}
      />
      <SplitLinks
        projectId={projectId}
        title={split.title}
        lines={active.lines}
      />
    </>
  );

  if (active.status === "confirmed")
    return (
      <>
        <ToneCallout tone="success">
          <span className="font-medium">{t.confirmed}</span> — {t.confirmedBody}
        </ToneCallout>
        {lines}
      </>
    );
  if (active.status === "disputed")
    return (
      <NextCard kind="decision" label={t.decision} title={t.disputed}>
        {disputes.map((line) => (
          <ToneCallout key={line.id} tone="danger">
            {page.disputed(line.name, line.confirmation.comment ?? "")}
          </ToneCallout>
        ))}
        {lines}
        <SplitEditorInline
          projectId={projectId}
          masterId={split.masterId}
          initial={active.lines}
          withNote
          startOpen={false}
          label={page.edit}
        />
      </NextCard>
    );
  return (
    <NextCard
      kind="wait"
      label={t.waiting}
      title={fr.legal.board.confirmations(confirmed, active.lines.length)}
    >
      <p className="text-sm text-muted-foreground">{t.waitingBody}</p>
      {lines}
    </NextCard>
  );
}

import { ProposeSplitButton } from "@/components/legal/splits/split-actions";
import { SplitLines } from "@/components/legal/splits/split-lines";
import { SplitLinks } from "@/components/legal/splits/split-links";
import { SplitVersionChanges } from "@/components/legal/splits/split-version-changes";
import { NextCard } from "@/components/ui/next-card";
import { SplitEditorInline } from "@/components/legal/tracking/split-editor-inline";
import { EmptyNote } from "@/components/shell/empty-state";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type {
  SplitLine,
  SplitVersionView,
  TitleSplit,
} from "@/lib/legal/splits/queries";

const muted =
  "text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]";

/**
 * One title's split in its démarche (recette Juridique V1, JUR-01): who
 * created what, who publishes each share, then the parts, typed by a
 * person (the editor); sent for confirmation — one link per creator and per
 * publisher outside the house (PDS Éditions is the team) — then each
 * answer; a dispute asks for a new version, nothing is erased.
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
  const { active, draft, hints } = split;
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
  const editor = (
    initial: SplitLine[],
    version: number | null,
    startOpen: boolean,
    label: string,
  ) => (
    <SplitEditorInline
      projectId={projectId}
      masterId={split.masterId}
      initial={initial}
      hints={hints}
      version={version}
      startOpen={startOpen}
      label={label}
    />
  );
  // Who answers by their own link: everyone but the house.
  const sendBody = (lines: SplitLine[]) =>
    t.sendBody(
      lines.filter((l) => !l.house).map((l) => l.name),
      lines.some((l) => l.house),
    );

  if (draft)
    return (
      <NextCard kind="act" label={t.next} title={t.send}>
        {changes(draft)}
        <SplitLines
          projectId={projectId}
          title={split.title}
          lines={draft.lines}
          open={false}
        />
        <p className={muted}>{sendBody(draft.lines)}</p>
        <ProposeSplitButton
          projectId={projectId}
          target={{ versionId: draft.id }}
          title={split.title}
        />
        {editor(draft.lines, active?.version ?? null, false, page.editFirst)}
      </NextCard>
    );

  if (!active) {
    if (split.proposal.length === 0)
      return <EmptyNote>{page.noCreators}</EmptyNote>;
    if (split.fromTitle)
      return (
        <NextCard kind="act" label={t.next} title={t.fromTitle}>
          <p className={muted}>{page.fromTitle}</p>
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
          {editor(split.proposal, null, false, page.editFirst)}
        </NextCard>
      );
    return (
      <NextCard kind="act" label={t.next} title={t.propose}>
        {editor(split.proposal, null, true, page.prepare)}
      </NextCard>
    );
  }

  const awaited = active.lines.filter((line) => !line.house);
  const confirmed = awaited.filter(
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
        {editor(active.lines, active.version, false, page.edit)}
      </NextCard>
    );
  return (
    <NextCard
      kind="wait"
      label={t.waiting}
      title={fr.legal.board.confirmations(confirmed, awaited.length)}
    >
      <p className={muted}>{t.waitingBody}</p>
      {lines}
    </NextCard>
  );
}

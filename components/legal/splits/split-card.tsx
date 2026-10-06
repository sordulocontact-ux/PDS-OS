import {
  ProposeSplitButton,
  SplitEditorButton,
} from "@/components/legal/splits/split-actions";
import { SplitLines } from "@/components/legal/splits/split-lines";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { SplitVersionView, TitleSplit } from "@/lib/legal/splits/queries";
import { splitVersionTone } from "@/lib/ui/state-tones";

function VersionHead({ version }: { version: SplitVersionView }) {
  const t = fr.legalSplits;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium">{t.page.version(version.version)}</span>
      <StatusBadge tone={splitVersionTone[version.status]} size="sm">
        {t.versionStates[version.status]}
      </StatusBadge>
      {version.note && (
        <span className="text-sm text-muted-foreground">
          {t.page.note(version.note)}
        </span>
      )}
    </div>
  );
}

/**
 * One title's split sheet: the active version and its answers (disputes
 * said in full), a new version in preparation, the versions it replaced.
 */
export function SplitCard({
  projectId,
  split,
}: {
  projectId: string;
  split: TitleSplit;
}) {
  const t = fr.legalSplits.page;
  const { active, draft } = split;
  const editorStart = draft?.lines ?? active?.lines ?? split.proposal;
  const action = (
    <div className="flex flex-wrap gap-2">
      <SplitEditorButton
        projectId={projectId}
        masterId={split.masterId}
        title={split.title}
        label={
          draft
            ? t.resume
            : active
              ? t.edit
              : split.fromTitle
                ? t.editFirst
                : t.prepare
        }
        initial={editorStart}
        withNote={Boolean(active)}
        primary={!active && !draft && !split.fromTitle}
      />
      {draft && (
        <ProposeSplitButton
          projectId={projectId}
          target={{ versionId: draft.id }}
          title={split.title}
        />
      )}
      {!active && !draft && split.fromTitle && (
        <ProposeSplitButton
          projectId={projectId}
          target={{ masterId: split.masterId }}
          title={split.title}
        />
      )}
    </div>
  );
  const disputes = (active?.lines ?? []).filter(
    (line) =>
      line.confirmation.state === "disputed" && line.confirmation.comment,
  );

  return (
    <PageSection
      card
      id={`split-${split.masterId}`}
      title={split.title}
      action={action}
    >
      {!active && !draft && split.fromTitle && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t.fromTitle}</p>
          <SplitLines
            projectId={projectId}
            title={split.title}
            lines={split.proposal}
            open={false}
          />
        </div>
      )}
      {!active && !draft && !split.fromTitle && (
        <EmptyNote>
          {split.proposal.length > 0 ? t.prepare : t.noCreators}
        </EmptyNote>
      )}
      {active && (
        <div className="flex flex-col gap-3">
          <VersionHead version={active} />
          {disputes.map((line) => (
            <ToneCallout key={line.id} tone="danger">
              {t.disputed(line.name, line.confirmation.comment ?? "")}
            </ToneCallout>
          ))}
          <SplitLines
            projectId={projectId}
            title={split.title}
            lines={active.lines}
            open={active.status !== "superseded"}
          />
        </div>
      )}
      {draft && (
        <div className="flex flex-col gap-3">
          <VersionHead version={draft} />
          <SplitLines
            projectId={projectId}
            title={split.title}
            lines={draft.lines}
            open={false}
          />
        </div>
      )}
      {split.history.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.history} :{" "}
          {split.history
            .map(
              (v) =>
                `${t.version(v.version)} (${fr.legalSplits.versionStates[v.status]})`,
            )
            .join(", ")}
        </p>
      )}
    </PageSection>
  );
}

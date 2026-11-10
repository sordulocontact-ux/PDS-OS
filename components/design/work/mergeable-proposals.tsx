"use client";

import { useState, type ReactNode } from "react";

import { MergeDialog } from "@/components/design/work/merge-dialog";
import {
  ConceptionProposalRow,
  type ProposalView,
} from "@/components/design/work/conception-proposal-row";
import { SplitDialog } from "@/components/design/work/split-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProposalRows } from "@/components/ui/proposal-group";
import { conceptionIntents } from "@/lib/i18n/fr/conception-intents";

const fr = { conceptionIntents };

/**
 * PO's proposals of one place, consolidated by the person (ticket § 4):
 * « Fusionner des propositions » shows a check box on each, two or more
 * checked are merged; split one into parts. The boxes only show while
 * merging, so they are never read as the way to confirm (Sacha,
 * 10/11/2026). Read-only for those who do not write: the cards alone.
 */
export function MergeableProposals({
  projectId,
  proposals,
  canWrite,
  target,
  targets,
  attachTargets,
  footer,
}: {
  projectId: string;
  proposals: ProposalView[];
  canWrite: boolean;
  // Where they are: a deliverable id, « direction », or "" (to attach).
  target: string;
  // Every target a merged or split proposal can go to.
  targets: Record<string, string>;
  // Proposals to attach: the card asks for the target first.
  attachTargets?: Record<string, string>;
  // At the foot of the rows: « Confirmer les n » of the section, whose rows
  // then only offer « Modifier » / « Écarter ».
  footer?: ReactNode;
}) {
  const t = fr.conceptionIntents.merge;
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [splitting, setSplitting] = useState<ProposalView | null>(null);
  const selected = proposals.filter((p) => checked.includes(p.id));
  const mergeable = canWrite && proposals.length > 1;
  const stop = () => {
    setSelecting(false);
    setChecked([]);
  };
  const toggle = (id: string) =>
    setChecked((all) =>
      all.includes(id) ? all.filter((x) => x !== id) : [...all, id],
    );

  return (
    <div className="flex flex-col gap-3">
      {mergeable && !selecting && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setSelecting(true)}
        >
          {t.start}
        </Button>
      )}
      {mergeable && selecting && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-caption text-muted-foreground tabular-nums">
            {t.select(selected.length)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selected.length < 2}
              onClick={() => setMerging(true)}
            >
              {t.open}
            </Button>
            <Button variant="ghost" size="sm" onClick={stop}>
              {t.cancel}
            </Button>
          </div>
        </div>
      )}
      <ProposalRows>
        {proposals.map((p) => (
          <ConceptionProposalRow
            key={p.id}
            projectId={projectId}
            proposal={p}
            canWrite={canWrite}
            targets={attachTargets}
            confirmInGroup={Boolean(footer)}
            leading={
              mergeable &&
              selecting && (
                <Checkbox
                  aria-label={t.pick(p.value)}
                  checked={checked.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
              )
            }
            extraActions={
              <Button variant="ghost" size="sm" onClick={() => setSplitting(p)}>
                {fr.conceptionIntents.split.open}
              </Button>
            }
          />
        ))}
        {footer}
      </ProposalRows>
      {merging && (
        <MergeDialog
          projectId={projectId}
          open={merging}
          onOpenChange={setMerging}
          proposals={selected}
          target={target}
          targets={targets}
          onDone={() => {
            setMerging(false);
            stop();
          }}
        />
      )}
      {splitting && (
        <SplitDialog
          projectId={projectId}
          open={Boolean(splitting)}
          onOpenChange={(open) => !open && setSplitting(null)}
          proposal={{ ...splitting, target }}
          targets={targets}
        />
      )}
    </div>
  );
}

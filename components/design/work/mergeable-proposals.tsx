"use client";

import { useState } from "react";

import { MergeDialog } from "@/components/design/work/merge-dialog";
import {
  ConceptionProposalRow,
  type ProposalView,
} from "@/components/design/work/conception-proposal-row";
import { SplitDialog } from "@/components/design/work/split-dialog";
import { Button } from "@/components/ui/button";
import { ProposalRows } from "@/components/ui/proposal-group";
import { fr } from "@/lib/i18n/fr";

/**
 * PO's proposals of one place, consolidated by the person (ticket § 4):
 * check two or more to merge them, split one into parts. Read-only for
 * those who do not write: the cards alone.
 */
export function MergeableProposals({
  projectId,
  proposals,
  canWrite,
  target,
  targets,
  attachTargets,
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
}) {
  const t = fr.conceptionIntents.merge;
  const [checked, setChecked] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [splitting, setSplitting] = useState<ProposalView | null>(null);
  const selected = proposals.filter((p) => checked.includes(p.id));
  const toggle = (id: string) =>
    setChecked((all) =>
      all.includes(id) ? all.filter((x) => x !== id) : [...all, id],
    );

  return (
    <div className="flex flex-col gap-3">
      {canWrite && proposals.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-caption text-muted-foreground tabular-nums">
            {t.select(selected.length)}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.length < 2}
            onClick={() => setMerging(true)}
          >
            {t.open}
          </Button>
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
            leading={
              canWrite &&
              proposals.length > 1 && (
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-foreground"
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
            setChecked([]);
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

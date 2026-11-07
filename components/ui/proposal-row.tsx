"use client";

import { useState, type ReactNode } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ProposalEditor } from "@/components/ui/proposal-editor";
import { ProposalSource } from "@/components/ui/proposal-source";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decisions } from "@/lib/i18n/fr/decisions";
import type { Proposal } from "@/lib/ui/proposal";
import { proposalTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.proposal;

/**
 * One proposal decided on its own (docs/VISION-UX.md rules 11, 12 and 21,
 * proto `itemRow`): its context, the words in bold (struck through once set
 * aside), the quote and where it was said, « Modifié par … », who decided.
 * On the right: « Confirmer » / « Modifier » / « Écarter » while proposed;
 * « Confirmé » + Modifier + Écarter once kept; « Écarté » + Confirmer once
 * set aside; the pill alone without the right to decide. « Modifier »
 * edits in place, PO's words under the field; saving confirms. The actions
 * are the module's Server Actions (each zone keeps its own table):
 * `onConfirm(text)` gets the reworded text, or nothing. `children`: what
 * the module adds under the words (a callout, a target to pick);
 * `leading`: before them (a check box to merge); `extraActions`: after the
 * buttons; `editAddon`: in the field (the microphone, given the field id).
 * `confirmInGroup`: a proposal is confirmed with the others of its group
 * (« Confirmer les n » of a dimension, Sacha 06/11/2026), so its own row
 * only offers « Modifier » / « Écarter ».
 */
export function ProposalRow({
  proposal,
  canEdit,
  onConfirm,
  onDiscard,
  leading,
  extraActions,
  editAddon,
  messages,
  confirmInGroup = false,
  children,
}: {
  proposal: Proposal;
  canEdit: boolean;
  onConfirm: (text?: string) => Promise<WriteResult>;
  onDiscard: () => Promise<WriteResult>;
  leading?: ReactNode;
  extraActions?: ReactNode;
  editAddon?: (fieldId: string) => ReactNode;
  // The module's own toasts, said with the verb of the button.
  messages?: { confirmed?: string; discarded?: string; saved?: string };
  confirmInGroup?: boolean;
  children?: ReactNode;
}) {
  const p = proposal;
  const [editing, setEditing] = useState(false);
  const { pending, error, setError, run } = useWriteSubmit(
    () => setEditing(false),
    messages?.confirmed ?? t.confirmed,
  );
  const fieldId = `proposal-${p.id}-text`;
  const discarded = p.state === "discarded";

  const confirm = (text?: string) =>
    run(
      () => onConfirm(text),
      text ? (messages?.saved ?? t.saved) : messages?.confirmed,
    );
  const discard = () =>
    run(onDiscard, messages?.discarded ?? t.discarded);
  const pill = (
    <StatusBadge tone={proposalTone[p.state]} size="sm">
      {t.states[p.state]}
    </StatusBadge>
  );
  const editButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        setError(null);
        setEditing(true);
      }}
    >
      {t.edit}
    </Button>
  );

  return (
    <div
      data-state={p.state}
      className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 border-b border-[color:var(--border-hairline)] px-3.5 py-3 text-body-sm last:border-b-0"
    >
      {leading}
      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-0.5">
        {p.context && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {p.context}
          </span>
        )}
        {editing ? (
          <ProposalEditor
            id={fieldId}
            defaultValue={p.text}
            original={p.original ?? p.text}
            pending={pending}
            addon={editAddon?.(fieldId)}
            onSave={(text) => confirm(text)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <b
              className={cn(
                "font-semibold break-words",
                discarded && "text-muted-foreground line-through",
              )}
            >
              {p.text}
            </b>
            <ProposalSource proposal={p} />
            {p.state !== "proposed" && p.decidedBy && (
              <span className="text-caption text-muted-foreground">
                {t.decidedBy(p.state === "kept", p.decidedBy)}
              </span>
            )}
          </>
        )}
        {children}
        {error && <FieldError id={`${fieldId}-error`}>{error}</FieldError>}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          editing && "hidden",
        )}
      >
        {!canEdit ? (
          pill
        ) : p.state === "proposed" ? (
          <>
            {confirmInGroup ? (
              pill
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={() => confirm()}
              >
                {t.confirm}
              </Button>
            )}
            {editButton}
            <Button variant="ghost" size="sm" disabled={pending} onClick={discard}>
              {t.discard}
            </Button>
          </>
        ) : p.state === "kept" ? (
          <>
            {pill}
            {editButton}
            <Button variant="ghost" size="sm" disabled={pending} onClick={discard}>
              {t.discard}
            </Button>
          </>
        ) : (
          <>
            {pill}
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => confirm()}
            >
              {t.confirm}
            </Button>
          </>
        )}
        {canEdit && extraActions}
      </div>
    </div>
  );
}

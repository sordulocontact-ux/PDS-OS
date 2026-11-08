"use client";

import { useState, type ReactNode } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ProposalEditor } from "@/components/ui/proposal-editor";
import { ProposalSource } from "@/components/ui/proposal-source";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decisions } from "@/lib/i18n/fr/decisions";
import type { Proposal } from "@/lib/ui/proposal";
import { cn } from "@/lib/utils";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.proposal;

/**
 * One proposal decided on its own (docs/VISION-UX.md rules 11, 12 and 21;
 * laid out after Vanta / Adaline, Sacha 07/11/2026: « très dur à lire »):
 * its state mark, then on the whole width its context, its words (struck
 * through once set aside), the quote set apart and one quiet line — the
 * state in words or who decided, « Modifié par … », where it was said — and
 * the buttons under it: « Confirmer » / « Modifier » / « Écarter » while
 * proposed; Modifier + Écarter once kept; « Confirmer » once set aside;
 * nothing without the right to decide. « Modifier » edits in place, PO's
 * words under the field; saving confirms. The actions are the module's
 * Server Actions (each zone keeps its own table): `onConfirm(text)` gets
 * the reworded text, or nothing. `children`: what the module adds under
 * the words (a callout, a target to pick); `leading`: before the mark (a
 * check box to merge); `extraActions`: after the buttons; `editAddon`: in
 * the field (the microphone, given the field id). `confirmInGroup`: a
 * proposal is confirmed with the others of its group (« Confirmer les n »
 * of a dimension, Sacha 06/11/2026), so its own row only offers
 * « Modifier » / « Écarter ».
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
  const mark: MarkState =
    p.state === "kept" ? "done" : discarded ? "off" : "todo";
  // The state in words, first on the quiet line (the mark only shows it).
  const stateWord = (
    <span
      className={cn(
        p.state === "proposed" &&
          "font-medium text-[color:var(--tone-warning-fg)]",
      )}
    >
      {p.state !== "proposed" && p.decidedBy
        ? t.decidedBy(p.state === "kept", p.decidedBy)
        : t.states[p.state]}
    </span>
  );
  // « Modifier » in outline, « Écarter » as text beside it: a ghost only
  // next to a secondary (docs/DESIGN.md « Bouton secondaire », Sacha).
  const editButton = (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={() => {
        setError(null);
        setEditing(true);
      }}
    >
      {t.edit}
    </Button>
  );
  const discardButton = (
    <Button variant="ghost" size="xs" disabled={pending} onClick={discard}>
      {t.discard}
    </Button>
  );
  const confirmButton = (variant: "outline" | "ghost") => (
    <Button
      variant={variant}
      size="xs"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => confirm()}
    >
      {t.confirm}
    </Button>
  );
  const actions = canEdit && !editing && (
    <div className="flex flex-wrap items-center gap-1.5">
      {p.state === "proposed" ? (
        <>
          {!confirmInGroup && confirmButton("outline")}
          {editButton}
          {discardButton}
        </>
      ) : p.state === "kept" ? (
        <>
          {editButton}
          {discardButton}
        </>
      ) : (
        confirmButton("outline")
      )}
      {extraActions}
    </div>
  );

  return (
    <div
      data-state={p.state}
      className="flex gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3.5 last:border-b-0"
    >
      {leading}
      <StateMark state={mark} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {p.context && (
          <span className="text-caption text-[color:var(--text-tertiary)]">
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
            <p
              className={cn(
                "text-body-md font-medium break-words text-[color:var(--text-primary)]",
                discarded && "text-muted-foreground line-through",
              )}
            >
              {p.text}
            </p>
            <ProposalSource proposal={p} lead={stateWord} />
          </>
        )}
        {children}
        {error && <FieldError id={`${fieldId}-error`}>{error}</FieldError>}
        {actions}
      </div>
    </div>
  );
}

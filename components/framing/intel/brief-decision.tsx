"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  decideBrief,
  generateBrief,
  sendBrief,
} from "@/lib/framing/actions/brief-versions";
import { DIMENSIONS, type Dimension } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";

/** The owner's moves on the latest version: update it, or send it. */
export function BriefOwnerActions({
  projectId,
  briefId,
  outdated,
}: {
  projectId: string;
  briefId: string;
  outdated: boolean;
}) {
  const t = fr.framingIntel.brief;
  const { pending, run } = useFramingAction();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (outdated)
    return (
      <Button
        size="lg"
        disabled={pending}
        onClick={() => run(() => generateBrief(projectId))}
      >
        {pending
          ? fr.framingIntel.guide.generating
          : fr.framingIntel.guide.update}
      </Button>
    );
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {t.send}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.send}
        description={t.notSent}
        closeLabel={fr.framingGuide.close}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => sendBrief(projectId, briefId, note),
              () => setOpen(false),
            );
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="brief-note">{t.sendNote}</Label>
            <Textarea
              id="brief-note"
              value={note}
              maxLength={500}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? t.sending : t.send}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}

/**
 * The validator's decision (ticket § 8): « Valider le Brief », or
 * « Demander une modification » with a precise comment and only the
 * dimensions to reopen.
 */
export function BriefValidatorActions({
  projectId,
  validationId,
}: {
  projectId: string;
  validationId: string;
}) {
  const t = fr.framingIntel.brief;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [approving, setApproving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const [dimensions, setDimensions] = useState<Set<Dimension>>(new Set());
  const toggle = (d: Dimension) =>
    setDimensions((set) => {
      const next = new Set(set);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  return (
    <>
      <Button size="lg" variant="outline" onClick={() => setAsking(true)}>
        {t.requestChange}
      </Button>
      <Button size="lg" onClick={() => setApproving(true)}>
        {t.approve}
      </Button>
      <ConfirmDialog
        open={approving}
        onOpenChange={setApproving}
        title={t.approveTitle}
        description={t.approveBody}
        cancelLabel={fr.framingIntel.guide.cancel}
        closeLabel={fr.framingGuide.close}
        confirmLabel={t.approve}
        pendingLabel={t.sending}
        pending={pending}
        onConfirm={() =>
          run(
            () => decideBrief(projectId, validationId, true, "", []),
            () => {
              setApproving(false);
              router.refresh();
            },
          )
        }
      />
      <FormDialog
        open={asking}
        onOpenChange={setAsking}
        title={t.requestChange}
        description={t.requestBody}
        closeLabel={fr.framingGuide.close}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                decideBrief(projectId, validationId, false, comment, [
                  ...dimensions,
                ]),
              () => setAsking(false),
            );
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">
              {t.dimensionsLabel}
            </legend>
            {DIMENSIONS.map((d, index) => (
              <label key={d} className="flex items-center gap-3 text-body-md">
                <input
                  type="checkbox"
                  className="size-4 accent-selection"
                  checked={dimensions.has(d)}
                  onChange={() => toggle(d)}
                />
                {fr.framingIntel.dimensionNumber(index)}{" "}
                {fr.framingIntel.dimensions[d]}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="brief-comment">{t.commentLabel}</Label>
            <Textarea
              id="brief-comment"
              value={comment}
              maxLength={2000}
              rows={4}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="lg"
              disabled={
                pending || comment.trim() === "" || dimensions.size === 0
              }
            >
              {t.submitChange}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}

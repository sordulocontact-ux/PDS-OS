"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { createDeal } from "@/lib/deals/actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";

const fr = { dialogs, legalParticipations };
const t = fr.legalParticipations.open;

// The select's value for « nobody yet ».
const NOBODY = "none";

/**
 * « Ouvrir un dossier » on a participation without a live deal (lot 11):
 * the Business module's own create_deal with the participation (never a
 * deal of PDS MIC's); who negotiates is optional. The page stays: the row
 * shows the new deal's stage.
 */
export function OpenDealButton({
  participationId,
  artist,
  title,
  again,
  negotiators,
}: {
  participationId: string;
  artist: string;
  // The title's name in the project.
  title: string;
  // Its last deal was abandoned.
  again: boolean;
  negotiators: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="xs"
        variant="outline"
        className="relative z-10"
        aria-label={t.label(artist, title)}
        onClick={() => setOpen(true)}
      >
        {again ? t.again : t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(artist, title)}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <OpenDealForm
            participationId={participationId}
            negotiators={negotiators}
            onDone={() => setOpen(false)}
          />
        )}
      </FormDialog>
    </>
  );
}

function OpenDealForm({
  participationId,
  negotiators,
  onDone,
}: {
  participationId: string;
  negotiators: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const [assignee, setAssignee] = useState(NOBODY);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          createDeal({
            participationId,
            assigneeId: assignee === NOBODY ? null : assignee,
          }),
        );
      }}
    >
      {negotiators.length > 0 && (
        <OptionSelect
          id={`open-deal-${participationId}`}
          name="assigneeId"
          label={t.negotiator}
          hint={t.negotiatorHint}
          items={{
            [NOBODY]: t.negotiatorNone,
            ...Object.fromEntries(negotiators.map((n) => [n.id, n.name])),
          }}
          defaultValue={NOBODY}
          onValueChange={setAssignee}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

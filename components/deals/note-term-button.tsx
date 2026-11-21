"use client";

import { useState } from "react";

import { TermForm } from "@/components/deals/term-form";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { FormDialog } from "@/components/ui/form-dialog";
import type { DealTerm } from "@/lib/deals/terms";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

/**
 * « Noter un terme », the main gesture of a deal in negotiation (Sacha
 * 21/11/2026: « je sais pas quoi faire »): which term, the ones not yet
 * confirmed first, then its form (TermForm), the same as in « Termes
 * négociés ».
 */
export function NoteTermButton({
  dealId,
  terms,
}: {
  dealId: string;
  terms: DealTerm[];
}) {
  const t = fr.deals.terms;
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const ordered = [
    ...terms.filter((term) => term.state !== "confirmed"),
    ...terms.filter((term) => term.state === "confirmed"),
  ];
  const term = terms.find((x) => x.key === key) ?? null;
  const close = () => {
    setOpen(false);
    setKey(null);
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t.note}</Button>
      <FormDialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : close())}
        title={term ? (t.labels[term.key] ?? term.key) : t.note}
        closeLabel={fr.dialogs.close}
      >
        {open &&
          (term ? (
            <TermForm dealId={dealId} term={term} onDone={close} />
          ) : (
            <ChipChoice
              name="term"
              legend={t.which}
              options={ordered.map((x) => ({
                value: x.key,
                label: t.labels[x.key] ?? x.key,
              }))}
              value={key}
              onChange={setKey}
            />
          ))}
      </FormDialog>
    </>
  );
}

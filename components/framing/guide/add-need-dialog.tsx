"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";

type Family = keyof typeof fr.framing.needs.families;

/**
 * "Ajouter un besoin": one outside the chips, with its family. It joins the
 * selection on screen; nothing is saved before "Confirmer cette sélection".
 */
export function AddNeedDialog({
  onAdd,
  disabled,
}: {
  onAdd: (label: string, family: Family) => void;
  disabled?: boolean;
}) {
  const t = fr.framingGuide.needs;
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [family, setFamily] = useState<Family>("creation_content");

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setLabel("");
          setOpen(true);
        }}
      >
        {t.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.add}
        description={t.addDescription}
        closeLabel={fr.framingGuide.close}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(label.trim(), family);
            setOpen(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="add-need-label" required>
              {t.label}
            </Label>
            <Input
              id="add-need-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="add-need-family" required>
              {t.family}
            </Label>
            <OptionSelect
              id="add-need-family"
              required
              label={t.family}
              options={fr.framing.needs.families}
              value={family}
              onChange={(v) => setFamily(v as Family)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="self-start"
            disabled={label.trim() === ""}
          >
            {t.add}
          </Button>
        </form>
      </FormDialog>
    </>
  );
}

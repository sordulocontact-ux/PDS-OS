"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { HolderSelect } from "@/components/production/holder-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { productionProducer } from "@/lib/i18n/fr/production-producer";
import { changeProductionRole } from "@/lib/production/role-actions";
import type { Holder, NetworkOption } from "@/lib/production/sheet";

const fr = { dialogs, productionProducer };

const t = fr.productionProducer.role;

/**
 * « Changer » on a role of « Qui fait quoi » (proto rolesModal): who holds
 * it now — a member, or for the director and the director of photography a
 * Réseau contact —, saved at once; the former holder stays in the history.
 */
export function RoleChangeButton({
  projectId,
  sheetId,
  role,
  label,
  current,
  members,
  contacts = [],
  noneLabel,
}: {
  projectId: string;
  sheetId: string;
  role: "producer" | "validator" | "director" | "dop" | "creativeExt";
  label: string;
  // What « nobody » means for this role (« Pas de validation externe »).
  noneLabel?: string;
  current: Holder | null;
  members: Member[];
  // Réseau contacts may hold the role (director, director of photography).
  contacts?: NetworkOption[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    current ? `${current.kind}:${current.id}` : "",
  );
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setOpen(false),
    t.done(label),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role === "validator" && !value) return setMissing(true);
    run(() =>
      changeProductionRole({ projectId, sheetId, role, holder: value }),
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t.changeLabel(label)}
        onClick={() => setOpen(true)}
      >
        {t.change}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(label)}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
          <HolderSelect
            id={`role-${role}`}
            label={t.holder}
            noneLabel={noneLabel ?? t.nobody}
            value={value}
            current={current}
            members={members}
            contacts={contacts}
            onChange={(v) => {
              setValue(v);
              setMissing(false);
            }}
            required={role === "validator"}
            error={missing ? t.required : undefined}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <DialogFormActions
            pending={pending}
            submitLabel={t.save}
            onCancel={() => setOpen(false)}
          />
        </form>
      </FormDialog>
    </>
  );
}

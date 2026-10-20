"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { RequiredMark } from "@/components/ui/required-mark";
import { PersonPickList } from "@/components/network/person-pick-list";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { listNetworkPeople } from "@/lib/network/people-actions";
import type { RecipientOption } from "@/lib/production/delivery/recipients";
import { deliverProduction } from "@/lib/production/light/actions";

const t = fr.productionLight.recipients;

/**
 * « Destinataires de la livraison * » then « Confirmer la livraison »
 * (proto recipientsPick): the ones PDS OS knows need the file pre-checked,
 * the project's members, « Ajouter un destinataire » from the Réseau (or a
 * contact created, or a bare name). At least one: red with its reason
 * after the first try. `handOff`: a light journey also hands over to the
 * member checked for Activations.
 */
export function DeliverForm({
  projectId,
  sheetId,
  options,
  viewerId,
  handOff,
  formats,
}: {
  projectId: string;
  sheetId: string;
  options: RecipientOption[];
  viewerId: string | null;
  handOff: boolean;
  formats: string[];
}) {
  const [list, setList] = useState(options);
  const [checked, setChecked] = useState(
    () => new Set(options.filter((o) => o.checked).map((o) => o.key)),
  );
  const [adding, setAdding] = useState(false);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => undefined,
    fr.productionLight.delivery.done,
  );
  const add = (o: RecipientOption) => {
    setList((l) => (l.some((x) => x.key === o.key) ? l : [...l, o]));
    setChecked((c) => new Set(c).add(o.key));
    setMissing(false);
    setAdding(false);
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const chosen = list.filter((o) => checked.has(o.key));
        setMissing(chosen.length === 0);
        if (chosen.length === 0) return;
        run(() =>
          deliverProduction({
            projectId,
            sheetId,
            handOff,
            formats,
            recipients: chosen.map((o) => ({
              personId: o.personId,
              contactId: o.contactId,
              name: o.personId || o.contactId ? "" : o.name,
              purpose: o.purpose,
            })),
          }),
        );
      }}
    >
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={missing ? "recipients-error" : undefined}
      >
        <legend className="mb-1 font-semibold">
          {t.legend}
          <RequiredMark />
        </legend>
        <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          {t.hint}
        </p>
        {list.map((o) => (
          <CheckboxField
            key={o.key}
            label={`${o.name}${o.personId && o.personId === viewerId ? t.you : ""}`}
            hint={o.detail ?? undefined}
            checked={checked.has(o.key)}
            onChange={(on) => {
              setChecked((c) => {
                const next = new Set(c);
                if (on) next.add(o.key);
                else next.delete(o.key);
                return next;
              });
              if (on) setMissing(false);
            }}
          />
        ))}
        {missing && <FieldError id="recipients-error">{t.required}</FieldError>}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            {t.add}
          </Button>
        </div>
      </fieldset>
      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title={t.addTitle}
        description={t.hint}
        closeLabel={fr.dialogs.close}
      >
        <PersonPickList
          load={async () => {
            const people = await listNetworkPeople();
            return people.map((p) => ({
              id: p.id,
              label: p.label,
              detail: p.detail,
            }));
          }}
          createRoles={[]}
          done={t.added}
          onChoose={async (id) => {
            const people = await listNetworkPeople();
            const p = people.find((x) => x.id === id);
            add({
              key: `contact:${id}`,
              personId: null,
              contactId: id,
              name: p?.label ?? "—",
              detail: t.network,
              purpose: null,
              checked: true,
            });
            return { ok: true };
          }}
          onKeepName={async (name) => {
            add({
              key: `name:${name}`,
              personId: null,
              contactId: null,
              name,
              detail: t.nameOnly,
              purpose: null,
              checked: true,
            });
            return { ok: true };
          }}
        />
      </FormDialog>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {fr.productionLight.delivery.confirm}
        </Button>
      </div>
    </form>
  );
}

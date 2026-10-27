"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Member } from "@/lib/framing/related";
import { productionBrief } from "@/lib/i18n/fr/production-brief";
import type { Holder, NetworkOption } from "@/lib/production/sheet";
import { setProductionDirector } from "@/lib/production/sheet-actions";

const fr = { productionBrief };

// Select values: "person:<uuid>", "contact:<uuid>", or NONE (the action
// takes "" to clear; an empty value does not fit a select item).
const NONE = "none";
const VIDEOGRAPHER = "videographer";

/** « Désigner » / « Changer » the director, for the project's owner: a member
 * first, then the Réseau, its videographers ahead. */
export function DirectorDialog({
  projectId,
  sheetId,
  director,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  director: Holder | null;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const t = fr.productionBrief.director;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {director ? t.change : t.designate}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={fr.productionBrief.close}
      >
        <DirectorForm
          projectId={projectId}
          sheetId={sheetId}
          director={director}
          members={members}
          contacts={contacts}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function DirectorForm({
  projectId,
  sheetId,
  director,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  director: Holder | null;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const t = fr.productionBrief.director;
  const initial = director ? `${director.kind}:${director.id}` : NONE;
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isVideographer = (c: NetworkOption) => c.roles.includes(VIDEOGRAPHER);
  const network = [
    ...contacts.filter(isVideographer),
    ...contacts.filter((c) => !isVideographer(c)),
  ];
  const contactLabel = (c: NetworkOption) =>
    isVideographer(c) ? `${c.name} · ${t.videographer}` : c.name;
  const items: Record<string, string> = {
    [NONE]: t.noneOption,
    ...Object.fromEntries(members.map((m) => [`person:${m.personId}`, m.name])),
    ...Object.fromEntries(
      network.map((c) => [`contact:${c.id}`, contactLabel(c)]),
    ),
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await setProductionDirector({
        projectId,
        sheetId,
        holder: value === NONE ? "" : value,
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-director">{t.field}</Label>
        <Select
          items={items}
          value={value}
          onValueChange={(next) => typeof next === "string" && setValue(next)}
        >
          <SelectTrigger
            id="production-director"
            className="w-full text-base data-[size=default]:h-10 md:text-sm"
          >
            <SelectValue placeholder={t.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t.noneOption}</SelectItem>
            {members.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t.members}</SelectLabel>
                {members.map((m) => (
                  <SelectItem key={m.personId} value={`person:${m.personId}`}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {network.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t.contacts}</SelectLabel>
                {network.map((c) => (
                  <SelectItem key={c.id} value={`contact:${c.id}`}>
                    {contactLabel(c)}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {fr.productionBrief.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending || value === initial}>
          {pending ? fr.productionBrief.saving : t.save}
        </Button>
      </div>
    </form>
  );
}

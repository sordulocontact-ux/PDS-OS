"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
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
import { productionNeeds } from "@/lib/i18n/fr/production-needs";
import { assignProductionNeed } from "@/lib/production/needs-actions";
import type { NetworkOption, ProductionNeed } from "@/lib/production/sheet";

import { AvailabilityChoices, availabilityOf } from "./assignment-availability";
import { holderGroups, type HolderOption } from "./assignment-holders";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";

const fr = { productionNeeds };

const t = fr.productionNeeds;

/**
 * « Affecter »: who holds the position (known profiles of the Réseau first,
 * then PDS's members, then the rest of the Réseau) and the availability the
 * person chose, « à confirmer » unless they already know.
 */
export function AssignmentForm({
  projectId,
  need,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  need: ProductionNeed;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const groups = holderGroups(need, members, contacts);
  const [holder, setHolder] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.assign.done);
  const id = `assign-${need.id}`;

  const all = [...groups.known, ...groups.members, ...groups.network];
  if (all.length === 0)
    return <FormMessage kind="info">{t.holders.nobody}</FormMessage>;
  const items = Object.fromEntries(all.map((o) => [o.value, o.label]));

  function submit(form: HTMLFormElement) {
    if (!holder) {
      setMissing(true);
      form.querySelector<HTMLElement>(`#${id}`)?.focus();
      return;
    }
    const data = new FormData(form);
    run(() =>
      assignProductionNeed({
        projectId,
        needId: need.id,
        holder,
        availability: availabilityOf(data.get("availability")),
        note: String(data.get("note") ?? ""),
      }),
    );
  }

  const group = (label: string, options: HolderOption[]) =>
    options.length > 0 && (
      <SelectGroup>
        <SelectLabel>{label}</SelectLabel>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectGroup>
    );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id} required>
          {t.assign.holder}
        </Label>
        <Select
          items={items}
          value={holder}
          onValueChange={(next) => {
            if (typeof next !== "string") return;
            setHolder(next);
            setMissing(false);
          }}
        >
          <SelectTrigger
            id={id}
            aria-required
            aria-invalid={missing || undefined}
            aria-describedby={missing ? `${id}-error` : undefined}
            className="w-full text-base data-[size=default]:h-10 md:text-sm"
          >
            <SelectValue placeholder={t.holders.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {group(t.holders.known, groups.known)}
            {group(t.holders.members, groups.members)}
            {group(t.holders.network, groups.network)}
          </SelectContent>
        </Select>
        {missing && (
          <FieldError id={`${id}-error`}>{t.missing.holder}</FieldError>
        )}
      </div>
      <AvailabilityChoices name="availability" defaultValue="to_confirm" />
      <TextareaField
        id={`${id}-note`}
        name="note"
        label={t.assignment.note}
        rows={2}
        maxLength={500}
        placeholder={t.assignment.notePlaceholder}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.assign.submit}
        onCancel={onDone}
      />
    </form>
  );
}

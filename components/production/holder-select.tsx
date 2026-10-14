"use client";

import { FieldError } from "@/components/auth/form-message";
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
import { fr } from "@/lib/i18n/fr";
import type { Holder, NetworkOption } from "@/lib/production/sheet";

// A select item cannot hold "": nobody is NONE on screen, "" in the form.
const NONE = "none";

/** The value a holder is sent as: "person:<id>", "contact:<id>" or "". */
export const holderValue = (holder: Holder | null) =>
  holder ? `${holder.kind}:${holder.id}` : "";

/**
 * Who holds something in Production (follows an incident, brings equipment
 * back, does a step, made a version): nobody until a person chooses, then a
 * member of PDS or a contact of the Réseau — never chosen by default. A
 * saved holder no longer listed (archived contact) keeps its name.
 */
export function HolderSelect({
  id,
  label,
  noneLabel,
  value,
  current = null,
  members,
  contacts,
  onChange,
  hint,
  required,
  error,
}: {
  id: string;
  label: string;
  noneLabel: string;
  value: string;
  // The saved holder, so it keeps its name when it is no longer listed.
  current?: Holder | null;
  members: Member[];
  contacts: NetworkOption[];
  onChange: (value: string) => void;
  hint?: string;
  // A required holder (« * »), and why it is missing after a first try.
  required?: boolean;
  error?: string;
}) {
  const t = fr.productionPrep.holderGroups;
  const items: Record<string, string> = {
    [NONE]: noneLabel,
    ...Object.fromEntries(members.map((m) => [`person:${m.personId}`, m.name])),
    ...Object.fromEntries(contacts.map((c) => [`contact:${c.id}`, c.name])),
  };
  const kept = current && !(holderValue(current) in items) ? current : null;
  if (kept) items[holderValue(kept)] = kept.name;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Select
        items={items}
        value={value === "" ? NONE : value}
        onValueChange={(next) =>
          typeof next === "string" && onChange(next === NONE ? "" : next)
        }
      >
        <SelectTrigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className="w-full text-base data-[size=default]:h-10 md:text-sm"
        >
          <SelectValue placeholder={noneLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{noneLabel}</SelectItem>
          {kept && (
            <SelectItem value={holderValue(kept)}>{kept.name}</SelectItem>
          )}
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
          {contacts.length > 0 && (
            <SelectGroup>
              <SelectLabel>{t.network}</SelectLabel>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={`contact:${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

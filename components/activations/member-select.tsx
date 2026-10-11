"use client";

import { OptionSelect } from "@/components/projects/option-select";
import type { Member } from "@/lib/framing/related";

// A select item cannot hold "": nobody is NONE on screen, "" when sent.
const NONE = "none";

/** The member chosen in a MemberSelect of `form`, "" for nobody. */
export function memberValue(data: FormData, name: string): string {
  const value = String(data.get(name) ?? "");
  return value === NONE ? "" : value;
}

/** A member of PDS (owner, expected person, task assignee), or nobody
 * (`noneLabel`) when the choice may stay empty. */
export function MemberSelect({
  name,
  label,
  members,
  defaultValue,
  noneLabel,
  required,
  error,
}: {
  name: string;
  label: string;
  members: Member[];
  defaultValue: string | null;
  noneLabel?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <OptionSelect
      name={name}
      label={label}
      required={required}
      error={error}
      placeholder={noneLabel}
      items={{
        ...(noneLabel ? { [NONE]: noneLabel } : {}),
        ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
      }}
      defaultValue={defaultValue ?? (noneLabel ? NONE : null)}
    />
  );
}

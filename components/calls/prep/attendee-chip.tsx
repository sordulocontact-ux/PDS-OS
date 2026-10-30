"use client";

import { IconXmark } from "nucleo-sharp-essential";
import type { Ref } from "react";

import { Avatar } from "@/components/ui/avatar";
import { chipClass } from "@/components/ui/name-chip";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { cn } from "@/lib/utils";

const fr = { callPrep };

const howOf = (person: PrepPerson) =>
  person.invite ? fr.callPrep.how[person.invite] : "";

/**
 * One participant as a chip (Teams, Outlook): avatar, name, « externe »,
 * and ✕ « Retirer X » when the list is edited. Its tooltip says who they
 * are and how they are invited.
 */
export function AttendeeChip({
  person,
  onRemove,
  removeRef,
}: {
  person: PrepPerson;
  onRemove?: () => void;
  removeRef?: Ref<HTMLButtonElement>;
}) {
  const t = fr.callPrep;
  return (
    <span
      title={t.tooltip(person.detail, howOf(person))}
      className={cn(chipClass, "pr-1 pl-[3px]")}
    >
      <Avatar
        name={person.name}
        pictureUrl={null}
        className="size-6 bg-[var(--surface-raised)]"
      />
      <span className="truncate">{person.name}</span>
      {person.external && (
        <span className="text-caption text-[color:var(--text-tertiary)]">
          {t.externalTag}
        </span>
      )}
      {onRemove ? (
        <button
          ref={removeRef}
          type="button"
          onClick={onRemove}
          aria-label={t.remove(person.name)}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-[var(--surface-pressed)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none"
        >
          <IconXmark aria-hidden className="size-3.5" />
        </button>
      ) : (
        <span aria-hidden className="w-1.5" />
      )}
    </span>
  );
}

/** The participants in read-only chips (summary, planned call). */
export function AttendeeChipList({
  people,
  className,
}: {
  people: PrepPerson[];
  className?: string;
}) {
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {people.map((person) => (
        <AttendeeChip key={person.key} person={person} />
      ))}
    </span>
  );
}

/** « Externes : Jade Petit (invitation par e-mail), … ». */
export function ExternalsLine({ people }: { people: PrepPerson[] }) {
  const t = fr.callPrep;
  const externals = people.filter((p) => p.external && p.invite);
  if (externals.length === 0) return null;
  return (
    <p className="text-caption text-[color:var(--text-tertiary)]">
      {t.externals(
        externals.map((p) => t.externalOf(p.name, howOf(p))).join(", "),
      )}
    </p>
  );
}

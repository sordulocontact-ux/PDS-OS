"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import { Label } from "@/components/ui/label";
import { emailParticipant, participantsPayload } from "@/lib/calls/prep/pool";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { listNetworkPeople } from "@/lib/network/people-actions";
import { cn } from "@/lib/utils";

import { AttendeeChip, ExternalsLine } from "./attendee-chip";
import { AttendeeSuggestions } from "./attendee-suggestions";
import { useAttendeeSearch } from "./use-attendee-search";

const fr = { callPrep };

/**
 * Who takes part, as in Teams or Outlook: one field of chips, type to find
 * someone of the team or the Réseau, Enter adds the best match, ↓ goes into
 * the list, Backspace on the empty field removes the last chip. An address
 * typed is invited by e-mail (its Réseau fiche is created with the call); an
 * unknown name opens « Nouvelle fiche dans le Réseau ». Always ids, never
 * a name typed. `hiddenNames` also sends them in a form (`attendees`,
 * `guests`), as « Nouveau call » expects.
 */
export function AttendeeChips({
  id,
  pool,
  value,
  onChange,
  required = false,
  error,
  hint,
  hiddenNames = false,
  filesEmails = true,
  invitesAll = true,
}: {
  id: string;
  pool: PrepPerson[];
  value: PrepPerson[];
  onChange: (next: PrepPerson[]) => void;
  required?: boolean;
  error?: string | null;
  hint?: string;
  hiddenNames?: boolean;
  // An address typed becomes a Réseau fiche (prepared calls), or stays an
  // address (« Nouveau call »): the last line of the list says which.
  filesEmails?: boolean;
  // true: everyone named is invited, so a contact without an address is
  // refused (calls). false: the list records who takes part and only the
  // team is invited (Sessions studio, Ibé 05/11/2026): any contact goes.
  invitesAll?: boolean;
}) {
  const t = fr.callPrep;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<PrepPerson[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  const [ownError, setOwnError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const all = [...pool, ...created];
  const { matches, newWho, best } = useAttendeeSearch(all, value, query);
  const shown = ownError ?? error ?? null;
  const listId = `${id}-suggestions`;

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);
  const add = (person: PrepPerson) => {
    setOwnError(null);
    if (invitesAll && !person.invite) {
      setOwnError(t.contactWithoutEmail(person.name));
      return;
    }
    if (!value.some((p) => p.key === person.key)) onChange([...value, person]);
    setQuery("");
    focusInput();
  };
  const addNew = () => {
    if (!newWho) return;
    if (newWho.kind === "name") return setCreating(newWho.value);
    add(emailParticipant(newWho.value, null, t.how.email));
  };
  const remove = (key: string) => {
    onChange(value.filter((p) => p.key !== key));
    focusInput();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (best === "new") addNew();
      else if (best) add(best);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => listRef.current?.querySelector("button")?.focus(), 0);
    } else if (e.key === "Backspace" && !query && value.length) {
      e.preventDefault();
      remove(value[value.length - 1].key);
    } else if (e.key === "Escape" && open) {
      // Closes the list only, not the panel or modal around the form.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const { attendees, guests } = participantsPayload(value);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} required={required}>
        {t.participants}
      </Label>
      {hiddenNames && (
        <>
          <input
            type="hidden"
            name="attendees"
            value={JSON.stringify(attendees)}
          />
          <input type="hidden" name="guests" value={JSON.stringify(guests)} />
        </>
      )}
      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setOpen(false);
        }}
      >
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border-field)] bg-transparent px-2 py-1.5 transition-colors focus-within:border-[var(--selection)] focus-within:ring-3 focus-within:ring-[var(--selection-bg)]",
            shown && "border-error",
          )}
        >
          {value.map((person) => (
            <AttendeeChip
              key={person.key}
              person={person}
              onRemove={() => remove(person.key)}
            />
          ))}
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={shown ? true : undefined}
            aria-describedby={shown ? `${id}-error` : undefined}
            autoComplete="off"
            value={query}
            placeholder={value.length ? t.add : t.addFirst}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-7 min-w-32 flex-1 bg-transparent px-1 text-body-md outline-none placeholder:text-muted-foreground"
          />
        </div>
        {open && (
          <AttendeeSuggestions
            ref={listRef}
            id={listId}
            matches={matches}
            newWho={newWho}
            onPick={add}
            onNew={addNew}
            onBack={() => inputRef.current?.focus()}
            emailDetail={filesEmails ? t.inviteEmailDetail : t.inviteEmailOnly}
          />
        )}
      </div>
      {shown && <FieldError id={`${id}-error`}>{shown}</FieldError>}
      {hint && !shown && (
        <p className="text-caption text-muted-foreground">{hint}</p>
      )}
      <ExternalsLine people={value} />
      <CreateContactDialog
        open={creating !== null}
        onOpenChange={(next) => !next && setCreating(null)}
        title={t.newPerson}
        name={creating ?? ""}
        roles={[]}
        onCreated={(contactId) => {
          setCreating(null);
          void listNetworkPeople().then((list) => {
            const c = list.find((x) => x.id === contactId);
            if (!c) return;
            const person: PrepPerson = {
              key: `c:${c.id}`,
              name: c.label,
              detail: c.detail || t.external,
              external: true,
              invite: c.email ? "email" : null,
              email: c.email?.toLowerCase() ?? null,
            };
            setCreated((list2) => [...list2, person]);
            add(person);
          });
        }}
      />
    </div>
  );
}

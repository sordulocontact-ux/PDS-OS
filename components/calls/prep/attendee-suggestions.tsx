"use client";

import { IconAtSign, IconPlus } from "nucleo-sharp-essential";
import type { KeyboardEvent, Ref } from "react";

import { Avatar } from "@/components/ui/avatar";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";

import type { NewWho } from "./use-attendee-search";

const ROW =
  "flex min-h-11 w-full items-center gap-2.5 px-3 py-1.5 text-left text-body-md outline-none hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)]";

/**
 * The list under the participants' field: who may be invited (avatar, name,
 * role, « Équipe » / « Externe »), then « Inviter … » or « Créer la fiche
 * de … ». ↑ / ↓ move between lines, Escape goes back to the field.
 */
export function AttendeeSuggestions({
  ref,
  id,
  matches,
  newWho,
  onPick,
  onNew,
  onBack,
  emailDetail,
}: {
  ref: Ref<HTMLDivElement>;
  id: string;
  matches: PrepPerson[];
  newWho: NewWho;
  onPick: (person: PrepPerson) => void;
  onNew: () => void;
  onBack: () => void;
  emailDetail: string;
}) {
  const t = fr.callPrep;
  if (matches.length === 0 && !newWho) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...e.currentTarget.querySelectorAll("button")];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = at + (e.key === "ArrowDown" ? 1 : -1);
      if (next < 0) onBack();
      else buttons[Math.min(next, buttons.length - 1)]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onBack();
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      role="listbox"
      aria-label={t.suggestions}
      onKeyDown={onKeyDown}
      className="absolute inset-x-0 top-full z-30 mt-1 max-h-[17.5rem] overflow-y-auto rounded-[10px] border border-[var(--border-default)] bg-popover py-1 shadow-elevation-2"
    >
      {matches.map((person) => (
        <button
          key={person.key}
          type="button"
          role="option"
          aria-selected={false}
          className={ROW}
          onClick={() => onPick(person)}
        >
          <Avatar name={person.name} pictureUrl={null} className="size-6" />
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold">{person.name}</b>{" "}
            <span className="text-caption text-[color:var(--text-tertiary)]">
              · {person.detail}
            </span>
          </span>
          <span className="shrink-0 text-caption text-[color:var(--text-tertiary)]">
            {person.external ? t.external : t.team}
          </span>
        </button>
      ))}
      {newWho && (
        <button
          type="button"
          role="option"
          aria-selected={false}
          className={`${ROW} border-t border-[var(--border-hairline)]`}
          onClick={onNew}
        >
          <span
            aria-hidden
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)]"
          >
            {newWho.kind === "email" ? (
              <IconAtSign className="size-3.5" />
            ) : (
              <IconPlus className="size-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold">
              {newWho.kind === "email"
                ? t.inviteEmail(newWho.value)
                : t.createContact(newWho.value)}
            </b>{" "}
            <span className="text-caption text-[color:var(--text-tertiary)]">
              · {newWho.kind === "email" ? emailDetail : t.createContactDetail}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

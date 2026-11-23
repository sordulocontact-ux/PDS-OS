"use client";

import { IconAtSign, IconXmark } from "nucleo-sharp-essential";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Avatar } from "@/components/ui/avatar";
import { chipClass } from "@/components/ui/name-chip";
import { mail } from "@/lib/i18n/fr/mail";
import { cn } from "@/lib/utils";
import { isEmail } from "@/lib/utils/email";
import { normalizeSearch } from "@/lib/utils/search";

import type { NetworkEmail } from "./use-network-emails";

const fr = { mail };

const ROW =
  "flex min-h-11 w-full items-center gap-2.5 px-3 py-1.5 text-left text-body-md outline-none hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)]";

/** Who an address is: its Réseau contact's name, else the address. */
export const nameOfAddress = (people: NetworkEmail[], email: string) =>
  people.find((p) => p.email === email.toLowerCase())?.name ?? email;

/**
 * An e-mail's « À », « Cc » or « Cci » as in a mail app (Sacha 22/11/2026):
 * one chip per address (the Réseau contact's name when known), type a name
 * to pick a Réseau contact that has an address, or type an address and
 * Entrée, a comma or leaving the field adds it. Backspace on the empty
 * field removes the last chip, Échap closes the list then the field.
 */
export function RecipientsField({
  id,
  label,
  value,
  onChange,
  people,
  error,
  onDone,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  people: NetworkEmail[];
  error?: string;
  // Échap on the empty field: the row goes back to its reading.
  onDone?: () => void;
}) {
  const t = fr.mail;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const [wrong, setWrong] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = `${id}-list`;

  const { matches, typed } = useMemo(() => {
    const raw = query.trim().toLowerCase();
    const q = normalizeSearch(raw);
    const free = people.filter((p) => !value.includes(p.email));
    const found = q
      ? free.filter((p) => normalizeSearch(`${p.name} ${p.email}`).includes(q))
      : free;
    const known = people.some((p) => p.email === raw);
    return {
      matches: found.slice(0, 8),
      typed: isEmail(raw) && !known && !value.includes(raw) ? raw : null,
    };
  }, [people, query, value]);

  const focus = () => setTimeout(() => input.current?.focus(), 0);
  const add = (email: string, refocus = true) => {
    const address = email.trim().toLowerCase();
    setWrong(null);
    if (!value.includes(address)) onChange([...value, address]);
    setQuery("");
    if (refocus) focus();
  };
  const remove = (email: string) => {
    onChange(value.filter((e) => e !== email));
    focus();
  };
  // What is typed, added if it is an address; otherwise said in red.
  const commit = (refocus = true) => {
    const raw = query.trim().replace(/[,;]+$/, "");
    if (!raw) return true;
    if (isEmail(raw.toLowerCase())) {
      add(raw, refocus);
      return true;
    }
    setWrong(t.notEmail(raw));
    return false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (typed) add(typed);
      else if (matches.length && query.trim()) add(matches[0].email);
      else if (!query.trim()) onDone?.();
      else commit();
    } else if (e.key === "," || e.key === ";") {
      e.preventDefault();
      commit();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => list.current?.querySelector("button")?.focus(), 0);
    } else if (e.key === "Backspace" && !query && value.length) {
      e.preventDefault();
      remove(value[value.length - 1]);
    } else if (e.key === "Escape") {
      // Closes the list, then the field, never the modal around it.
      e.preventDefault();
      e.stopPropagation();
      if (open && (matches.length || typed)) setOpen(false);
      else onDone?.();
    }
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...e.currentTarget.querySelectorAll("button")];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = at + (e.key === "ArrowDown" ? 1 : -1);
      if (next < 0) input.current?.focus();
      else buttons[Math.min(next, buttons.length - 1)]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      input.current?.focus();
    }
  };

  const shown = wrong ?? error;
  const listed = open && (matches.length > 0 || typed);
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative"
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOpen(false);
          commit(false);
        }}
      >
        <div
          onClick={() => input.current?.focus()}
          className={cn(
            "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border-field)] bg-card px-2 py-1.5 transition-colors focus-within:border-[var(--selection)] focus-within:ring-3 focus-within:ring-[var(--selection-bg)]",
            shown && "border-error",
          )}
        >
          {value.map((email) => {
            const name = nameOfAddress(people, email);
            return (
              <span
                key={email}
                title={email}
                className={cn(chipClass, "pr-1 pl-[3px]")}
              >
                <Avatar
                  name={name}
                  pictureUrl={null}
                  className="size-6 bg-[var(--surface-raised)]"
                />
                <span className="truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => remove(email)}
                  aria-label={t.remove(name)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-[var(--surface-pressed)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none"
                >
                  <IconXmark aria-hidden className="size-3.5" />
                </button>
              </span>
            );
          })}
          <input
            ref={input}
            id={id}
            autoFocus
            role="combobox"
            aria-label={label}
            aria-expanded={Boolean(listed)}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={shown ? true : undefined}
            aria-describedby={shown ? `${id}-error` : undefined}
            autoComplete="off"
            value={query}
            placeholder={value.length ? t.addMore : t.addFirst}
            onChange={(e) => {
              setQuery(e.target.value);
              setWrong(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-7 min-w-40 flex-1 bg-transparent px-1 text-body-md outline-none placeholder:text-muted-foreground"
          />
        </div>
        {listed && (
          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-label={t.suggestions}
            onKeyDown={onListKeyDown}
            // In the flow, under the field: the mail's card and its rows clip
            // what overflows them (Sacha 23/11/2026, a list cut off).
            className="mt-1 max-h-[17.5rem] overflow-y-auto rounded-[10px] border border-[var(--border-default)] bg-popover py-1 shadow-elevation-2"
          >
            {matches.map((p) => (
              <button
                key={p.email}
                type="button"
                role="option"
                aria-selected={false}
                className={ROW}
                onClick={() => add(p.email)}
              >
                <Avatar name={p.name} pictureUrl={null} className="size-6" />
                <span className="min-w-0 flex-1 truncate">
                  <b className="font-semibold">{p.name}</b>{" "}
                  <span className="text-caption text-[color:var(--text-tertiary)]">
                    · {p.email}
                  </span>
                </span>
                {p.detail && (
                  <span className="shrink-0 truncate text-caption text-[color:var(--text-tertiary)]">
                    {p.detail}
                  </span>
                )}
              </button>
            ))}
            {typed && (
              <button
                type="button"
                role="option"
                aria-selected={false}
                className={cn(
                  ROW,
                  matches.length > 0 &&
                    "border-t border-[var(--border-hairline)]",
                )}
                onClick={() => add(typed)}
              >
                <span
                  aria-hidden
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)]"
                >
                  <IconAtSign className="size-3.5" />
                </span>
                <b className="min-w-0 flex-1 truncate font-semibold">
                  {t.addAddress(typed)}
                </b>
              </button>
            )}
          </div>
        )}
      </div>
      {shown && <FieldError id={`${id}-error`}>{shown}</FieldError>}
    </div>
  );
}

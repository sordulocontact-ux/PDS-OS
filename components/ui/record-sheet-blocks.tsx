import type { ComponentType } from "react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { NameChip, NameChips } from "@/components/ui/name-chip";
import {
  SheetBlock,
  SheetLine,
  SheetLines,
} from "@/components/ui/record-sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  SheetItem,
  SheetLink,
  SheetPerson,
} from "@/lib/ui/record-sheet";

// The blocks of a record's side sheet that every record shares (§ 6.7 bis):
// its people, the records linked to it. Each block is absent when empty.

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

/** People of the record: avatar, name (to their page), a detail at the
 * right, a neutral badge after it. `compact`: inside a fold of the
 * summary card (avatar 24). */
export function SheetPeopleList({
  people,
  compact = false,
}: {
  people: SheetPerson[];
  compact?: boolean;
}) {
  return (
    <SheetLines>
      {people.map((person) => (
        <div key={person.id} className="flex items-center gap-3">
          <Avatar
            name={person.name}
            pictureUrl={person.pictureUrl ?? null}
            className={compact ? "size-6" : "size-8"}
          />
          {person.href ? (
            <Link
              href={person.href}
              className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
            >
              {person.name}
            </Link>
          ) : (
            <span className="min-w-0 flex-1 truncate">{person.name}</span>
          )}
          {person.detail && (
            <span className="truncate text-caption text-[color:var(--text-secondary)]">
              {person.detail}
            </span>
          )}
          {person.badge && (
            <StatusBadge tone="neutral" size="sm">
              {person.badge}
            </StatusBadge>
          )}
        </div>
      ))}
    </SheetLines>
  );
}

/** Records to their pages, a detail at the right: the list a count of the
 * summary card folds (« Calls passés », « Titres crédités »). */
export function SheetItemList({ items }: { items: SheetItem[] }) {
  return (
    <SheetLines>
      {items.map((item) => (
        <div key={item.id} className="flex min-w-0 items-center gap-3">
          {item.href ? (
            <Link
              href={item.href}
              className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="min-w-0 flex-1 break-words">{item.label}</span>
          )}
          {item.detail && (
            <span className="shrink-0 text-caption text-[color:var(--text-secondary)]">
              {item.detail}
            </span>
          )}
        </div>
      ))}
    </SheetLines>
  );
}

/** The block of a record's people, absent when there is none. */
export function SheetPeopleBlock({
  title,
  people,
}: {
  title: string;
  people: SheetPerson[];
}) {
  if (people.length === 0) return null;
  return (
    <SheetBlock title={title}>
      <SheetPeopleList people={people} />
    </SheetBlock>
  );
}

export type SheetLinkedRow = {
  icon: IconType;
  label: string;
  // A badge beside a pill: a party's role on a contract.
  links: (SheetLink & { badge?: string | null })[];
};

/** « Fiches liées »: one line a kind of record, each a pill to its page. */
export function SheetLinkedBlock({
  title,
  rows,
}: {
  title: string;
  rows: SheetLinkedRow[];
}) {
  const shown = rows.filter((row) => row.links.length > 0);
  if (shown.length === 0) return null;
  return (
    <SheetBlock title={title}>
      <SheetLines>
        {shown.map((row) => (
          <SheetLine key={row.label} icon={row.icon} label={row.label}>
            <NameChips>
              {row.links.map((link) => (
                <span
                  key={link.id}
                  className="inline-flex max-w-full items-center gap-1.5"
                >
                  <NameChip name={link.label} href={link.href} />
                  {link.badge && (
                    <StatusBadge tone="neutral" size="sm">
                      {link.badge}
                    </StatusBadge>
                  )}
                </span>
              ))}
            </NameChips>
          </SheetLine>
        ))}
      </SheetLines>
    </SheetBlock>
  );
}

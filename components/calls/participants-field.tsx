"use client";

import { useEffect, useMemo, useState } from "react";

import { SearchPicker } from "@/components/catalog/search-picker";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import { FilterChip } from "@/components/ui/filter-chip";
import type { Participant } from "@/lib/calls/participants";
import { fr } from "@/lib/i18n/fr";
import {
  listNetworkPeople,
  type NetworkPersonOption,
} from "@/lib/network/people-actions";

/**
 * Who takes part in a prepared exchange: the team proposed by PO (a chip
 * removes one), then anyone picked in one search over the team and the
 * Réseau, or added to the Réseau without leaving the form (UX test of
 * 09/10/2026: names typed freely were outside the Réseau).
 */
export function ParticipantsField({
  id,
  people,
  onChange,
  hint,
}: {
  // Heading id, for aria-labelledby.
  id: string;
  people: Participant[];
  onChange: (people: Participant[]) => void;
  // Shown when the list is empty (when it is required).
  hint?: string;
}) {
  const t = fr.calls.prepare;
  // The team as PO proposed it: chosen again after being removed.
  const [team] = useState(() => people.filter((p) => !p.contactId));
  const [contacts, setContacts] = useState<NetworkPersonOption[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    void listNetworkPeople().then(setContacts);
  }, []);

  const options = useMemo(
    () => [
      ...team.map((p) => ({
        id: `n:${p.name}`,
        label: p.name,
        detail: t.teamDetail,
      })),
      ...contacts.map((c) => ({
        id: `c:${c.id}`,
        label: c.label,
        detail: c.detail,
      })),
    ],
    [team, contacts, t.teamDetail],
  );
  const keyOf = (p: Participant) =>
    p.contactId ? `c:${p.contactId}` : `n:${p.name}`;
  const picked = useMemo(() => new Set(people.map(keyOf)), [people]);

  const add = (person: Participant) => {
    if (!picked.has(keyOf(person))) onChange([...people, person]);
  };
  const pick = (optionId: string) => {
    const value = optionId.slice(2);
    if (optionId.startsWith("n:")) return add({ name: value, contactId: null });
    const contact = contacts.find((c) => c.id === value);
    if (contact) add({ name: contact.label, contactId: contact.id });
  };

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-sm font-medium">
        {t.participants}
      </h3>
      {people.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <FilterChip
              key={keyOf(person)}
              pressed
              aria-label={t.removeParticipant(person.name)}
              onClick={() =>
                onChange(people.filter((p) => keyOf(p) !== keyOf(person)))
              }
            >
              {person.name}
            </FilterChip>
          ))}
        </div>
      ) : (
        hint && <p className="text-caption text-muted-foreground">{hint}</p>
      )}
      <SearchPicker
        label={t.searchLabel}
        placeholder={t.participantPlaceholder}
        options={options}
        excludedIds={picked}
        onPick={pick}
        onCreate={(query) => setCreating(query)}
        createLabel={(query) =>
          query
            ? fr.network.picker.createNamed(query)
            : fr.network.picker.create
        }
        noResultLabel={t.noResult}
        allSelectedLabel={t.allPicked}
      />
      <CreateContactDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        name={creating ?? ""}
        roles={[]}
        onCreated={(contactId) => {
          const name = creating ?? "";
          setCreating(null);
          void listNetworkPeople().then((list) => {
            setContacts(list);
            const contact = list.find((c) => c.id === contactId);
            add({ name: contact?.label ?? name, contactId });
          });
        }}
      />
    </section>
  );
}

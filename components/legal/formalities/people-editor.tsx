"use client";

import { cn } from "@/lib/utils";
import { nestedCardClass } from "@/components/ui/nested-card";
import { IconPlus } from "nucleo-sharp-essential";
import { useEffect, useRef, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import type { DossierErrors } from "@/lib/legal/formalities/field-errors";
import {
  CATEGORY_OF,
  categoriesOf,
  creatorName,
  onBulletin,
  reshare,
  type ShareCategory,
} from "@/lib/legal/formalities/participants";
import {
  ensureMainArtistContact,
  listPublishingContracts,
  listSacemCreators,
  listSacemPublishers,
  type PublishingContractOption,
} from "@/lib/legal/formalities/party-actions";

import { CreatorCard } from "./creator-card";
import { PublisherRow } from "./publisher-row";

const fr = { legalFormalities };

const blankCreator: Creator = {
  last_name: "",
  first_name: "",
  pseudonym: "",
  ipi: "",
  roles: [],
  shares: {},
  signs: true,
};
const blankPublisher: Publisher = { name: "", ipi: "", share: "" };

export type People = { creators: Creator[]; publishers: Publisher[] };

// Stable keys for rows that can be removed from the middle: each row keeps
// its picker (and what it loaded) when an earlier one goes.
function useRowIds(count: number) {
  const next = useRef(count);
  const [ids, setIds] = useState(() =>
    Array.from({ length: count }, (_, i) => String(i)),
  );
  return {
    ids,
    add: () => setIds((all) => [...all, String(next.current++)]),
    remove: (i: number) => setIds((all) => all.filter((_, j) => j !== i)),
  };
}

// The categories whose members a change of roles changes.
function rolesChanged(before: Creator, after: Creator): ShareCategory[] {
  const was = onBulletin(before) ? before.roles : [];
  const is = onBulletin(after) ? after.roles : [];
  return [
    ...was.filter((r) => !is.includes(r)),
    ...is.filter((r) => !was.includes(r)),
  ].map((r) => CATEGORY_OF[r]);
}

/** The participants (`part` « creators ») or the music publishers
 * (« publishers ») of the bulletin — its sections 2 and 3 (JUR-02, retour
 * d'Ibé du 02/11/2026): each picked in the Réseau with what they did; the
 * shares are typed by category in « 4. Répartition ». Who joins or leaves a
 * category shares it equally again (`reshare`). */
export function PeopleEditor({
  part,
  masterId,
  formalityId,
  people,
  noPublisher,
  disabled,
  errors,
  fromSplit = false,
  hasSplit = true,
  onPeople,
  onNoPublisher,
}: {
  part: "creators" | "publishers";
  masterId: string;
  // The project's publishing contracts are read through it (JUR-25).
  formalityId: string;
  people: People;
  // « Aucun éditeur musical » said explicitly.
  noPublisher: boolean;
  disabled: boolean;
  // The shares come from the confirmed split: to verify.
  fromSplit?: boolean;
  // The title has a confirmed split.
  hasSplit?: boolean;
  errors: DossierErrors | null;
  onPeople: (next: People) => void;
  onNoPublisher: (none: boolean) => void;
}) {
  const t = fr.legalFormalities;
  const { creators, publishers } = people;
  const creatorRows = useRowIds(creators.length);
  const publisherRows = useRowIds(publishers.length);
  const loadCreators = usePickerLoad(() => listSacemCreators(masterId));
  const loadPublishers = usePickerLoad(() => listSacemPublishers(masterId));
  const [contracts, setContracts] = useState<PublishingContractOption[]>([]);
  useEffect(() => {
    if (part !== "publishers") return;
    let active = true;
    listPublishingContracts(formalityId).then((list) => {
      if (active) setContracts(list);
    });
    return () => {
      active = false;
    };
  }, [formalityId, part]);
  // A main artist without a Réseau fiche gets one from their artist of the
  // Catalogue, and the participant is filled with it (Sacha, 09/11/2026):
  // once, when the editor opens.
  const linking = useRef(false);
  useEffect(() => {
    if (part !== "creators" || disabled || linking.current) return;
    const todo = creators.filter(
      (c) => c.main_artist && c.artist_id && !c.contact_id,
    );
    if (todo.length === 0) return;
    linking.current = true;
    Promise.all(
      todo.map((c) =>
        ensureMainArtistContact(masterId, c.artist_id!).then(
          (id) => [c.artist_id!, id] as const,
        ),
      ),
    ).then(async (pairs) => {
      const idOf = new Map(
        pairs.flatMap(([artist, id]) => (id ? [[artist, id] as const] : [])),
      );
      if (idOf.size === 0) return;
      // The picker reads the new fiche from a fresh list.
      await loadCreators(true);
      onPeople({
        creators: creators.map((c) =>
          c.artist_id && !c.contact_id && idOf.has(c.artist_id)
            ? { ...c, contact_id: idOf.get(c.artist_id) }
            : c,
        ),
        publishers,
      });
    });
  }, [part, disabled, creators, publishers, masterId, onPeople, loadCreators]);
  // The participants by position, named, for « Éditeur de » (JUR-22).
  const creatorNames = creators.flatMap((c, i) =>
    onBulletin(c) ? [{ position: i + 1, name: creatorName(c) }] : [],
  );

  const change = (
    nextCreators: Creator[],
    nextPublishers: Publisher[],
    changed: ShareCategory[],
  ) =>
    onPeople(
      changed.length > 0
        ? reshare(nextCreators, nextPublishers, changed)
        : { creators: nextCreators, publishers: nextPublishers },
    );
  const setCreator = (i: number, patch: Partial<Creator>) => {
    const next = { ...creators[i], ...patch };
    change(
      creators.map((c, j) => (j === i ? next : c)),
      publishers,
      rolesChanged(creators[i], next),
    );
  };
  const removeCreator = (i: number) => {
    creatorRows.remove(i);
    // The publishers' links follow the participants' new positions.
    const removed = i + 1;
    change(
      creators.filter((_, j) => j !== i),
      publishers.map((p) => ({
        ...p,
        represents: (p.represents ?? [])
          .filter((n) => n !== removed)
          .map((n) => (n > removed ? n - 1 : n)),
      })),
      categoriesOf(creators[i]),
    );
  };
  const addPublisher = () => {
    publisherRows.add();
    onNoPublisher(false);
    change(creators, [...publishers, blankPublisher], ["publisher"]);
  };

  if (part === "creators")
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">{t.notes.creators}</p>
        {fromSplit && !disabled && (
          <ToneCallout tone="warning">{t.notes.phonoFromSplit}</ToneCallout>
        )}
        {!hasSplit && !disabled && (
          <ToneCallout tone="neutral">{t.notes.noConfirmedSplit}</ToneCallout>
        )}
        <FieldError id={`creators-${masterId}-error`}>
          {errors?.fields.creators}
        </FieldError>
        {creators.map((c, i) => (
          <CreatorCard
            key={creatorRows.ids[i] ?? i}
            rowId={`${masterId}-${creatorRows.ids[i] ?? i}`}
            creator={c}
            load={loadCreators}
            disabled={disabled}
            errors={errors?.creators[i]}
            onChange={(patch) => setCreator(i, patch)}
            onRemove={() => removeCreator(i)}
          />
        ))}
        {!disabled && (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            disabled={creators.length >= 10}
            onClick={() => {
              creatorRows.add();
              onPeople({ creators: [...creators, blankCreator], publishers });
            }}
          >
            <IconPlus aria-hidden />
            {t.creator.add}
          </Button>
        )}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">
        {t.publisher.explain}
      </p>
      <FieldError id={`publishers-${masterId}-error`}>
        {errors?.fields.publishers}
      </FieldError>
      {publishers.length === 0 && noPublisher && (
        <div
          className={cn(
            nestedCardClass,
            "flex flex-wrap items-center justify-between gap-2",
          )}
        >
          <p className="text-sm font-medium">{t.publisher.noneChosen}</p>
          {!disabled && (
            <Button size="sm" variant="outline" onClick={addPublisher}>
              <IconPlus aria-hidden />
              {t.publisher.addFirst}
            </Button>
          )}
        </div>
      )}
      {publishers.length === 0 && !noPublisher && !disabled && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={addPublisher}>
            <IconPlus aria-hidden />
            {t.publisher.addFirst}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNoPublisher(true)}
          >
            {t.publisher.none}
          </Button>
        </div>
      )}
      {publishers.map((p, i) => (
        <PublisherRow
          key={publisherRows.ids[i] ?? i}
          rowId={`${masterId}-${publisherRows.ids[i] ?? i}`}
          publisher={p}
          load={loadPublishers}
          disabled={disabled}
          onChange={(patch) =>
            onPeople({
              creators,
              publishers: publishers.map((x, j) =>
                j === i ? { ...x, ...patch } : x,
              ),
            })
          }
          errors={errors?.publishers[i]}
          creators={creatorNames}
          contracts={contracts}
          onRemove={() => {
            publisherRows.remove(i);
            change(
              creators,
              publishers.filter((_, j) => j !== i),
              ["publisher"],
            );
          }}
        />
      ))}
      {publishers.length > 0 && !disabled && (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          disabled={publishers.length >= 3}
          onClick={addPublisher}
        >
          <IconPlus aria-hidden />
          {t.publisher.add}
        </Button>
      )}
    </div>
  );
}

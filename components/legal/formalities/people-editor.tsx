"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useEffect, useRef, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import type { DossierErrors } from "@/lib/legal/formalities/field-errors";
import { splitShareOf, type SplitShare } from "@/lib/legal/formalities/prefill";
import {
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
  quality: "",
  phono: "",
  signs: true,
};
const blankPublisher: Publisher = { name: "", ipi: "", phono: "" };

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

/** Creators 1 to 5 (`part` « creators ») or publishers 1 to 3 (« publishers
 * »), each picked in the Réseau with an exact Phono share — the bulletin's
 * sections 2 and 3 (JUR-02); the total is in « 4. Répartition »
 * (`PhonoTotal`). */
export function PeopleEditor({
  part,
  masterId,
  formalityId,
  creators,
  publishers,
  disabled,
  errors,
  fromSplit = false,
  splitShares = null,
  onCreators,
  onPublishers,
}: {
  part: "creators" | "publishers";
  masterId: string;
  // The project's publishing contracts are read through it (JUR-25).
  formalityId: string;
  // The title's confirmed split: someone added by hand takes their share.
  splitShares?: SplitShare[] | null;
  creators: Creator[];
  publishers: Publisher[];
  disabled: boolean;
  // The Phono shares come from the confirmed split: to verify.
  fromSplit?: boolean;
  errors: DossierErrors | null;
  onCreators: (next: Creator[]) => void;
  onPublishers: (next: Publisher[]) => void;
}) {
  const t = fr.legalFormalities;
  const creatorRows = useRowIds(creators.length);
  const publisherRows = useRowIds(publishers.length);
  const loadCreators = usePickerLoad(() => listSacemCreators(masterId));
  const loadPublishers = usePickerLoad(() => listSacemPublishers(masterId));
  const [contracts, setContracts] = useState<PublishingContractOption[]>([]);
  useEffect(() => {
    let active = true;
    listPublishingContracts(formalityId).then((list) => {
      if (active) setContracts(list);
    });
    return () => {
      active = false;
    };
  }, [formalityId]);
  // The creators by position, named, for « Éditeur de » (JUR-22).
  const creatorNames = creators.map((c, i) => ({
    position: i + 1,
    name: c.pseudonym || [c.first_name, c.last_name].filter(Boolean).join(" "),
  }));
  // A person picked gets their share of the confirmed split, if theirs is
  // still empty (UX test of 09/10/2026: « parts Phono connues, non
  // pré-remplies »).
  const [pickedShare, setPickedShare] = useState(false);
  const shareOf = (
    current: { phono: string; contact_id?: string },
    change: { contact_id?: string },
    role: string,
  ) => {
    if (current.phono || !change.contact_id) return {};
    const phono = splitShareOf(splitShares, change.contact_id, role);
    if (phono) setPickedShare(true);
    return phono ? { phono } : {};
  };
  const setCreator = (i: number, change: Partial<Creator>) =>
    onCreators(
      creators.map((c, j) =>
        j === i
          ? {
              ...c,
              ...change,
              ...shareOf(c, change, change.quality || c.quality),
            }
          : c,
      ),
    );
  const setPublisher = (i: number, change: Partial<Publisher>) =>
    onPublishers(
      publishers.map((p, j) =>
        j === i ? { ...p, ...change, ...shareOf(p, change, "publisher") } : p,
      ),
    );

  return (
    <div className="flex flex-col gap-4">
      {part === "creators" && (
        <>
          <p className="text-sm text-muted-foreground">{t.notes.creators}</p>
          {(fromSplit || pickedShare) && !disabled && (
            <ToneCallout tone="warning">{t.notes.phonoFromSplit}</ToneCallout>
          )}
          {!splitShares && !disabled && (
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
              onChange={(change) => setCreator(i, change)}
              onRemove={() => {
                creatorRows.remove(i);
                onCreators(creators.filter((_, j) => j !== i));
                // The publishers' links follow the creators' new positions.
                const removed = i + 1;
                onPublishers(
                  publishers.map((p) => ({
                    ...p,
                    represents: (p.represents ?? [])
                      .filter((n) => n !== removed)
                      .map((n) => (n > removed ? n - 1 : n)),
                  })),
                );
              }}
            />
          ))}
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              disabled={creators.length >= 5}
              onClick={() => {
                creatorRows.add();
                onCreators([...creators, blankCreator]);
              }}
            >
              <IconPlus aria-hidden />
              {t.creator.add}
            </Button>
          )}
        </>
      )}
      {part === "publishers" && (
        <>
          {publishers.map((p, i) => (
            <PublisherRow
              key={publisherRows.ids[i] ?? i}
              rowId={`${masterId}-${publisherRows.ids[i] ?? i}`}
              publisher={p}
              load={loadPublishers}
              disabled={disabled}
              onChange={(change) => setPublisher(i, change)}
              errors={errors?.publishers[i]}
              creators={creatorNames}
              contracts={contracts}
              onRemove={() => {
                publisherRows.remove(i);
                onPublishers(publishers.filter((_, j) => j !== i));
              }}
            />
          ))}
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              disabled={publishers.length >= 3}
              onClick={() => {
                publisherRows.add();
                onPublishers([...publishers, blankPublisher]);
              }}
            >
              <IconPlus aria-hidden />
              {t.publisher.add}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

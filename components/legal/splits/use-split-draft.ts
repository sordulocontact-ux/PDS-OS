"use client";

import { useState } from "react";

import { usePickerLoad } from "@/components/network/use-picker-load";
import {
  draftOf,
  type CreatorDraft,
  type PublishingHint,
  type SplitDraft,
} from "@/lib/legal/splits/draft";
import {
  listSplitPeople,
  listSplitPublishers,
} from "@/lib/legal/splits/party-actions";
import type { SplitLine } from "@/lib/legal/splits/queries";

const EMPTY: Omit<CreatorDraft, "key"> = {
  name: "",
  role: null,
  contactId: null,
  creditId: null,
  share: "",
  mode: null,
  publisher: null,
  coedition: false,
  source: null,
};

/** The split editor's draft (lib/legal/splits/draft.ts), and the people
 * and publishers it may name (read once, again after an addition to the
 * Réseau). */
export function useSplitDraft(
  masterId: string,
  initial: SplitLine[],
  hints: Record<string, PublishingHint>,
) {
  const [draft, setDraft] = useState<SplitDraft>(() =>
    draftOf(initial, (line) =>
      line.contactId ? (hints[line.contactId] ?? null) : null,
    ),
  );
  const people = usePickerLoad(() => listSplitPeople(masterId));
  const publishers = usePickerLoad(() => listSplitPublishers());

  const setCreator = (key: number, change: Partial<CreatorDraft>) =>
    setDraft((d) => ({
      ...d,
      creators: d.creators.map((c) =>
        c.key === key ? { ...c, ...change } : c,
      ),
    }));

  return {
    draft,
    people,
    publishers,
    setCreator,
    // Picking a person fills what PDS OS knows of their publisher.
    pickCreator: (key: number, change: Partial<CreatorDraft>) => {
      const hint = change.contactId ? hints[change.contactId] : undefined;
      setCreator(key, {
        ...change,
        ...(hint && {
          mode: hint.mode,
          coedition: hint.coedition,
          source: hint.source,
        }),
      });
    },
    add: () =>
      setDraft((d) => ({
        ...d,
        creators: [
          ...d.creators,
          {
            key: Math.max(-1, ...d.creators.map((c) => c.key)) + 1,
            ...EMPTY,
          },
        ],
      })),
    remove: (key: number) =>
      setDraft((d) => ({
        ...d,
        creators: d.creators.filter((c) => c.key !== key),
      })),
    setPublisherShare: (key: string, share: string) =>
      setDraft((d) => ({
        ...d,
        publisherShares: { ...d.publisherShares, [key]: share },
      })),
    setNote: (note: string) => setDraft((d) => ({ ...d, note })),
  };
}

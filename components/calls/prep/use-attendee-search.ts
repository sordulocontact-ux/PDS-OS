"use client";

import { useMemo } from "react";

import type { PrepPerson } from "@/lib/calls/prep/types";
import { isEmail } from "@/lib/utils/email";
import { normalizeSearch } from "@/lib/utils/search";

export type NewWho = { kind: "email" | "name"; value: string } | null;

/**
 * What the participants' field suggests for what is typed: the people not
 * yet picked whose name or role contains it, then the last line (« Inviter
 * x@y.fr » for an address, « Créer la fiche de « X » » for a name nobody
 * has). `best` is what Enter adds: a name that starts with the text, else
 * one that contains it, else the last line, else the first suggestion.
 */
export function useAttendeeSearch(
  pool: PrepPerson[],
  picked: PrepPerson[],
  query: string,
) {
  return useMemo(() => {
    const raw = query.trim();
    const q = normalizeSearch(raw);
    const taken = new Set(picked.map((p) => p.key));
    const free = pool.filter((p) => !taken.has(p.key));
    const matches = q
      ? free.filter((p) => normalizeSearch(`${p.name} ${p.detail}`).includes(q))
      : free;
    const words = (p: PrepPerson) => normalizeSearch(p.name).split(/\s+/);
    const starts = q
      ? matches.find((p) => words(p).some((w) => w.startsWith(q)))
      : undefined;
    const contains = q
      ? matches.find((p) => normalizeSearch(p.name).includes(q))
      : undefined;
    const newWho: NewWho =
      raw.length < 2 || starts
        ? null
        : isEmail(raw.toLowerCase())
          ? { kind: "email", value: raw.toLowerCase() }
          : { kind: "name", value: raw };
    const best: PrepPerson | "new" | null =
      starts ?? contains ?? (newWho ? "new" : (matches[0] ?? null));
    return { matches, newWho, best };
  }, [pool, picked, query]);
}

"use client";

import { useEffect, useRef, useState } from "react";

import { searchNotesText, type NoteTextHits } from "@/lib/notes/search-actions";

// From this many characters the text of the notes is searched too.
const MIN_LENGTH = 3;
// A pause after the last key before the server is asked.
const DELAY_MS = 250;

type Found = { callIds: ReadonlySet<string>; noteIds: ReadonlySet<string> };

const toSets = (hits: NoteTextHits): Found => ({
  callIds: new Set(hits.callIds),
  noteIds: new Set(hits.noteIds),
});

/**
 * The search of the notes' text (report, transcript, note), beside the
 * title search: `setQuery` takes what is typed, the server (searchNotesText)
 * is asked after a pause once it holds 3 characters, and `found` keeps the
 * previous answer until the next arrives, so the rows never blink. An answer
 * of an older query is dropped. Under 3 characters, nothing is used.
 */
export function useTextSearch() {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const latest = useRef(0);
  const text = query.length >= MIN_LENGTH ? query : "";

  useEffect(() => {
    const ask = ++latest.current;
    if (!text) return;
    const timer = setTimeout(() => {
      searchNotesText(text).then(
        (hits) => {
          if (ask === latest.current) setFound(toSets(hits));
        },
        () => {
          if (ask === latest.current) setFound(null);
        },
      );
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // `setQuery` is stable: SearchableList's effect runs on the text only.
  return { found: text ? found : null, onQueryChange: setQuery };
}

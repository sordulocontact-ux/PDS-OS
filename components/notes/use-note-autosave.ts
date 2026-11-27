"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import { createNote, updateNote } from "@/lib/notes/actions";
import type { NoteLink } from "@/lib/notes/views";

/** What a note's document holds. */
export type NoteDraft = { title: string; body: string; link: NoteLink | null };

/** idle: nothing to save yet; pending: typed, saved after a pause. */
export type NoteSaveState = "idle" | "pending" | "saving" | "saved" | "failed";

// The pause after the last key before saving.
const PAUSE_MS = 800;

const keyOf = (draft: NoteDraft) =>
  JSON.stringify([draft.title, draft.body, draft.link?.kind, draft.link?.id]);

const isEmpty = (draft: NoteDraft) => !draft.title.trim() && !draft.body.trim();

/**
 * A note saved as one types (Sacha 27/11/2026, after Accordee): created at
 * the first save worth it (a title or a text), then changed after each
 * pause and when the panel closes (`flush`), through createNote / updateNote
 * (the user's session). Saves run one after another, so a note is never
 * created twice; a failure says so (toast, « Non enregistré ») and what is
 * typed stays, saved at the next pause. A new note left empty creates
 * nothing. `noteId`: the note being changed, null for a new one.
 */
export function useNoteAutosave(noteId: string | null, start: NoteDraft) {
  const [draft, setDraft] = useState(start);
  const [state, setState] = useState<NoteSaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const id = useRef(noteId);
  // A note being changed starts saved; a new one (even pre-filled) does not.
  const saved = useRef(noteId ? keyOf(start) : null);
  const latest = useRef(start);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const saveNow = useCallback(async () => {
    const current = latest.current;
    const key = keyOf(current);
    if (key === saved.current || (!id.current && isEmpty(current))) {
      // Typed then undone: nothing left to save.
      setState((now) =>
        now === "pending" ? (id.current ? "saved" : "idle") : now,
      );
      return;
    }
    setState("saving");
    const input = {
      title: current.title,
      body: current.body,
      link: current.link && { kind: current.link.kind, id: current.link.id },
    };
    const result = id.current
      ? await updateNote({ ...input, id: id.current })
      : await createNote(input);
    if (!result.ok) {
      setState("failed");
      toast.error(result.error);
      return;
    }
    id.current = result.id;
    saved.current = key;
    setSavedAt(new Date().toISOString());
    setState(keyOf(latest.current) === key ? "saved" : "pending");
  }, []);

  /** Saves what is typed now (closing the panel), after any save running. */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = queue.current.then(saveNow, saveNow);
    return queue.current;
  }, [saveNow]);

  const change = useCallback(
    (patch: Partial<NoteDraft>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setDraft(next);
      setState((now) => (now === "failed" ? now : "pending"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, PAUSE_MS);
    },
    [flush],
  );

  // A panel closed some other way (route change): what is typed is saved.
  useEffect(() => () => void flush(), [flush]);

  return { draft, change, flush, state, savedAt };
}

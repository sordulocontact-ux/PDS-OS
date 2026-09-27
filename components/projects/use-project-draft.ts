"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveProjectDraft } from "@/lib/projects/draft-actions";

// How often the form is read; a draft is written only when it changed.
const SAVE_EVERY_MS = 1500;
// Hidden or technical fields, never part of a draft.
const SKIPPED = new Set(["intent", "projectId", "draftId"]);

export type DraftStatus = "idle" | "saving" | "saved" | "error";

function snapshot(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [field, value] of new FormData(form).entries()) {
    if (!SKIPPED.has(field) && typeof value === "string") values[field] = value;
  }
  return values;
}

/**
 * Keeps the new project form as a draft while it is typed (feedback n°6):
 * the form is read every 1.5 s, and on leaving the page, and saved when it
 * changed. Several fields are custom controls writing hidden inputs, which
 * fire no event: reading the form is what sees them all. Nothing is saved
 * before a first change. Once saved, the address carries `?draft=` so a
 * reload resumes it (set without a navigation, which would re-render the
 * form mid-typing). Stops once the form is submitted, and for good if the
 * draft was deleted meanwhile (project created in another tab).
 */
export function useProjectDraft(
  formRef: React.RefObject<HTMLFormElement | null>,
  initialDraftId: string | null,
  enabled: boolean,
) {
  const router = useRouter();
  const [draftId, setDraftId] = useState(initialDraftId);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const id = useRef(initialDraftId);
  const saved = useRef<string | null>(null);
  const inFlight = useRef(false);
  const stopped = useRef(false);

  // `leaving`: saved even unchanged, so the drafts of the projects list are fresh
  // when coming back to it.
  const save = useCallback(
    async (leaving = false) => {
      const form = formRef.current;
      if (!form || stopped.current || inFlight.current) return;
      const values = snapshot(form);
      const serialized = JSON.stringify(values);
      // The form as it was first shown (blank, or prefilled) is the baseline.
      if (saved.current === null) saved.current = serialized;
      const changed = serialized !== saved.current;
      if (!changed && !(leaving && id.current)) return;

      inFlight.current = true;
      setStatus("saving");
      const result = await saveProjectDraft(id.current, values, leaving);
      inFlight.current = false;
      if (!result.ok) {
        setStatus("error");
        return;
      }
      if (result.id === null) {
        stopped.current = true;
        setStatus("idle");
        return;
      }
      saved.current = serialized;
      setStatus("saved");
      if (id.current !== result.id) {
        id.current = result.id;
        setDraftId(result.id);
        const url = new URL(window.location.href);
        url.searchParams.set("draft", result.id);
        window.history.replaceState(null, "", url);
      }
    },
    [formRef],
  );

  useEffect(() => {
    if (!enabled) return;
    // Back to this page from the browser history: the cached page predates
    // the draft the address now names, so it is read again.
    const named = new URL(window.location.href).searchParams.get("draft");
    if (named && named !== id.current) {
      router.refresh();
      return;
    }
    // The baseline is read right away, before anything is typed.
    void save();
    const timer = window.setInterval(() => void save(), SAVE_EVERY_MS);
    const flush = () => void save();
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      // Leaving by a link of the app: what was typed last is kept too.
      void save(true);
    };
  }, [enabled, save, router]);

  return {
    draftId,
    status,
    // Called on submit (the created project deletes the draft), and again
    // with `false` if the creation was refused.
    pause: useCallback((paused: boolean) => {
      stopped.current = paused;
    }, []),
  };
}

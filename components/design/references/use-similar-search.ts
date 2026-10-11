"use client";

import { useState } from "react";

import {
  readSimilarMoodboard,
  searchSimilarReferences,
} from "@/lib/design/actions/reference-similar";
import type { SimilarGroup } from "@/lib/design/similar-rules";

export type SimilarSearch =
  | { phase: "start"; error?: string }
  | { phase: "reading" }
  | { phase: "searching" }
  | { phase: "results"; look: string | null; groups: SimilarGroup[] };

/**
 * « Chercher des références semblables » in two server calls, so the screen
 * says which step it is on: PO reads the moodboard (when its searches can
 * run), then the sources are searched. A failure brings the person back to
 * the start, with the reason.
 */
export function useSimilarSearch(projectId: string, reads: boolean) {
  const [state, setState] = useState<SimilarSearch>({ phase: "start" });

  async function run(base: string, arenaLink: string) {
    // PO reads only when its searches have somewhere to run (`reads`).
    let reading: {
      look: string;
      searches: string[];
      tags: string[];
    } | null = null;
    if (reads) {
      setState({ phase: "reading" });
      const read = await readSimilarMoodboard({ projectId, base });
      if (!read.ok) return setState({ phase: "start", error: read.error });
      reading = read.reading;
    }
    setState({ phase: "searching" });
    const found = await searchSimilarReferences({
      projectId,
      base,
      searches: reading?.searches ?? [],
      tags: reading?.tags ?? [],
      arenaLink: arenaLink.trim(),
    });
    if (!found.ok) return setState({ phase: "start", error: found.error });
    setState({
      phase: "results",
      look: reading?.look ?? null,
      groups: found.groups,
    });
  }

  return { state, run, reset: () => setState({ phase: "start" }) };
}

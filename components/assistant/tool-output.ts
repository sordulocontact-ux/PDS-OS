import type { Source } from "@/lib/assistant/sources";

/** What the UI takes from a function result: facts and links, both built by code. */
export type ToolEvidence = { facts: string[]; sources: Source[] };

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const isSources = (v: unknown): v is Source[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as Source).href === "string" &&
      typeof (x as Source).label === "string",
  );

export function evidenceOf(output: unknown): ToolEvidence {
  if (typeof output !== "object" || output === null)
    return { facts: [], sources: [] };
  const o = output as { facts?: unknown; sources?: unknown };
  return {
    facts: isStringArray(o.facts) ? o.facts : [],
    // Only internal links: a result can never make the UI point outside the app.
    sources: isSources(o.sources)
      ? o.sources.filter((s) => s.href.startsWith("/"))
      : [],
  };
}

/** The model is asked for plain text; strip the Markdown it sometimes adds anyway. */
export function plainText(text: string): string {
  return (
    text
      // Links written by the model are never trusted: only code-built sources are clickable.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/`([^`]*)`/g, "$1")
  );
}

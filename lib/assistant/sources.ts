/** A link shown under an answer. Built by code from function results, never by the model. */
export type Source = { label: string; href: string };

export function uniqueSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) =>
    seen.has(s.href) ? false : (seen.add(s.href), true),
  );
}

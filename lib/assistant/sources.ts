/** A link shown under an answer. Built by code from function results, never by the model. */
export type Source = { label: string; href: string };

export function uniqueSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) =>
    seen.has(s.href) ? false : (seen.add(s.href), true),
  );
}

/** Links under one heading: the project (or title) they belong to. */
export type SourceGroup = {
  title: string;
  // The heading's own page, when a source points to it.
  href: string | null;
  items: Source[];
};

const SEPARATOR = " · ";

/**
 * Sources grouped by what their label starts with (« Lumière froide ·
 * Juridique »: labels are built by code as « owner · page »), the owner
 * written once as the heading.
 */
export function groupSources(sources: Source[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  for (const source of sources) {
    const cut = source.label.indexOf(SEPARATOR);
    const title = cut === -1 ? source.label : source.label.slice(0, cut);
    const group = groups.get(title) ?? { title, href: null, items: [] };
    groups.set(title, group);
    if (cut === -1) group.href = source.href;
    else
      group.items.push({
        label: source.label.slice(cut + SEPARATOR.length),
        href: source.href,
      });
  }
  return [...groups.values()];
}

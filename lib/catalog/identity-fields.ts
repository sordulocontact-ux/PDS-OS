// The fields of an artist's identity (MKT-C2-04), as artist_identity_versions
// stores them. Client-safe: the form, the artist's page and the Conception
// share them.

export const IDENTITY_TEXTS = [
  "manifesto",
  "tone",
  "palette",
  "typography",
  "symbols",
] as const;
export type IdentityText = (typeof IDENTITY_TEXTS)[number];

export const IDENTITY_REF_KINDS = [
  "reference",
  "counter",
  "moodboard",
] as const;
export type IdentityRefKind = (typeof IDENTITY_REF_KINDS)[number];

export type IdentityRef = {
  kind: IdentityRefKind;
  url: string;
  title: string | null;
  note: string | null;
};

export type IdentityFields = Record<IdentityText, string | null> & {
  refs: IdentityRef[];
};

const text = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** A stored row (or a draft) read as fields; malformed references dropped. */
export function identityFieldsOf(row: {
  manifesto: string | null;
  tone: string | null;
  palette: string | null;
  typography: string | null;
  symbols: string | null;
  refs: unknown;
}): IdentityFields {
  const refs = Array.isArray(row.refs) ? row.refs : [];
  return {
    manifesto: text(row.manifesto),
    tone: text(row.tone),
    palette: text(row.palette),
    typography: text(row.typography),
    symbols: text(row.symbols),
    refs: refs.flatMap((r): IdentityRef[] => {
      if (!r || typeof r !== "object") return [];
      const o = r as Record<string, unknown>;
      const kind = IDENTITY_REF_KINDS.find((k) => k === o.kind);
      const url = text(o.url);
      if (!kind || !url || !/^https:\/\/\S+$/.test(url)) return [];
      return [{ kind, url, title: text(o.title), note: text(o.note) }];
    }),
  };
}

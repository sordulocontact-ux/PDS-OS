// « Doublon probable » of a press target (proto RP_MEDIA `dup`, « Doublon
// probable de « Le Contrechamp » »; docs/projet-complet/activations.md row
// 34): the same media under another card of the Réseau, or the same
// journalist already targeted under another media. Computed by code from
// names and addresses, never stored; an alert, confirmed, never a refusal.
// Pure, client-safe.

// Words that do not tell two media apart (« Le Contrechamp », « Contrechamp
// Magazine »).
const NOISE = new Set([
  "le",
  "la",
  "les",
  "l",
  "the",
  "de",
  "du",
  "des",
  "magazine",
  "mag",
  "media",
  "medias",
  "webzine",
  "journal",
  "revue",
  "radio",
  "tv",
  "fr",
  "com",
]);

// Mailboxes shared by everyone: their domain says nothing.
const SHARED_DOMAINS = new Set([
  "gmail.com",
  "yahoo.fr",
  "yahoo.com",
  "hotmail.fr",
  "hotmail.com",
  "outlook.fr",
  "outlook.com",
  "icloud.com",
  "orange.fr",
  "free.fr",
  "wanadoo.fr",
  "laposte.net",
  "sfr.fr",
  "protonmail.com",
  "proton.me",
]);

/** « Le Contrechamp » and « Contrechamp Magazine » → « contrechamp ». */
export function mediaKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !NOISE.has(w))
    .join(" ");
}

const domainOf = (email: string | null) => {
  const d = email?.split("@")[1]?.trim().toLowerCase();
  return d && !SHARED_DOMAINS.has(d) ? d : null;
};

export type MediaCard = { id: string; name: string; email: string | null };

/** The first other card that is probably the same media, or null. */
export function probableDuplicate(
  media: MediaCard,
  others: readonly MediaCard[],
): MediaCard | null {
  const key = mediaKey(media.name);
  const domain = domainOf(media.email);
  return (
    others.find((o) => {
      if (o.id === media.id) return false;
      const other = mediaKey(o.name);
      const sameName =
        key.length >= 3 &&
        other.length >= 3 &&
        (key === other ||
          (Math.min(key.length, other.length) >= 5 &&
            (key.includes(other) || other.includes(key))));
      return sameName || (domain !== null && domain === domainOf(o.email));
    }) ?? null
  );
}

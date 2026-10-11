import { normalizeSearch } from "@/lib/utils/search";

// Contacts of the Réseau a new one may duplicate (ticket « Retour PO /
// Réseau » of 11/10/2026): found by the code, never by PO, and only said,
// never blocking, since two people may share a name. Same name without case,
// accents nor separators, or the same words in another order
// (« Morel Inès » for « Inès Morel »).

const words = (name: string) =>
  name
    .split(/[\s\-–—'’.,]+/)
    .map(normalizeSearch)
    .filter(Boolean)
    .sort()
    .join(" ");

export function similarContacts<T extends { id: string; name: string }>(
  name: string,
  contacts: readonly T[],
  exceptId?: string,
): T[] {
  const typed = normalizeSearch(name);
  if (!typed) return [];
  const typedWords = words(name);
  return contacts.filter(
    (contact) =>
      contact.id !== exceptId &&
      (normalizeSearch(contact.name) === typed ||
        words(contact.name) === typedWords),
  );
}

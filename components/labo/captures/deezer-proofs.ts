import type { DeezerAccount } from "@/lib/catalog/capture-artist-types";
import { fr } from "@/lib/i18n/fr";

const quoted = (values: string[]) => values.map((v) => `« ${v} »`).join(", ");

/** Why the code holds a Deezer account: one sentence per proof found. */
export function proofSentences(account: DeezerAccount): string[] {
  const t = fr.laboCaptures.proofs;
  const networks = fr.laboCaptures.socials;
  const match = account.accountMatch;
  return [
    match &&
      t.account(
        t.sources[match.source],
        networks[match.network],
        `@${match.handle}`,
      ),
    account.bioMatch.length > 0 && t.bio(quoted(account.bioMatch)),
    account.evidence.length > 0 && t.releases(quoted(account.evidence)),
  ].filter((sentence): sentence is string => !!sentence);
}

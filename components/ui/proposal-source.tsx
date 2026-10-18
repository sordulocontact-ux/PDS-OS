import Link from "next/link";

import { fr } from "@/lib/i18n/fr";
import type { Proposal } from "@/lib/ui/proposal";

const t = fr.decisions.proposal;

/**
 * Where a proposal comes from, under its words (proto `itemRow` `.src`):
 * « Modifié par … » first, then « « citation » · source », the source a
 * link when it has a page (the call). The quote stays after an edit.
 */
export function ProposalSource({
  proposal,
}: {
  proposal: Pick<Proposal, "quote" | "from" | "href" | "editedBy">;
}) {
  const { quote, from, href, editedBy } = proposal;
  if (!quote && !from && !editedBy) return null;
  const source =
    from && href ? (
      <Link
        href={href}
        className="underline underline-offset-2 hover:text-foreground"
      >
        {from}
      </Link>
    ) : (
      from
    );
  return (
    <span className="text-caption break-words text-muted-foreground">
      {editedBy && t.editedBy(editedBy)}
      {editedBy && (quote || from) && " · "}
      {quote && t.quote(quote)}
      {quote && from && " · "}
      {source}
    </span>
  );
}

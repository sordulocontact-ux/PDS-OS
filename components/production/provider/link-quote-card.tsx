import type { PortalCardItem } from "@/components/portal/portal-sections";
import { portal } from "@/lib/i18n/fr/portal";
import { productionLink } from "@/lib/i18n/fr/production-link";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatDay, formatShortDay } from "@/lib/utils/day";

import { LinkQuoteForm } from "./link-quote-form";
import { LinkQuoteList } from "./link-quote-list";

const fr = { productionLink, portal };

const t = fr.productionLink.quote;

/**
 * « Devis » on the company's link (proto): the versions it deposited and
 * what PDS said of them; « Déposer le devis Vn · avant le … » when it is
 * its turn — first, after a modification asked or a refusal, or a revision
 * asked on the validated one; else what PDS is doing with it.
 */
export function linkQuoteCard(
  token: string,
  j: LinkJourney,
  company: string,
): PortalCardItem {
  const last = j.quotes[0] ?? null;
  const toDeposit =
    !last ||
    ["changes", "rejected"].includes(last.status) ||
    (last.status === "approved" && j.quoteRevision !== null);
  const due = j.quoteDue
    ? t.before(formatShortDay(j.quoteDue, { bare: true }))
    : null;
  return {
    id: "ps-quote",
    title: t.title,
    state: toDeposit
      ? "todo"
      : last?.status === "approved"
        ? "done"
        : "waiting",
    order: 10,
    action: { label: p.quote, due },
    dueKey: j.quoteDue,
    body: (
      <>
        <LinkQuoteList quotes={j.quotes} company={company} />
        {toDeposit ? (
          <LinkQuoteForm
            token={token}
            number={(last?.number ?? 0) + 1}
            locHint={t.locHint(1, j.shootOn ? formatDay(j.shootOn) : null)}
            revision={j.quoteRevision?.reason ?? null}
          />
        ) : last?.status === "deposited" || last?.status === "submitted" ? (
          <p className="rounded-xl bg-[var(--surface-soft)] px-3.5 py-3 text-[color:var(--text-secondary)]">
            {last.status === "deposited" ? t.waitCheck : t.waitDecide}
          </p>
        ) : null}
      </>
    ),
  };
}

const p = fr.portal.provider;

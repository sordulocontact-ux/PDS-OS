import { PageSection } from "@/components/shell/page-section";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import { networkPrivacy } from "@/lib/i18n/fr/network-privacy";
import {
  makeContactPrivate,
  makeContactShared,
} from "@/lib/network/privacy-actions";
import type { ContactPrivacyEvent } from "@/lib/network/privacy-queries";
import { formatInstantDay } from "@/lib/utils/instant";

const t = networkPrivacy;

/**
 * Whether a contact is private (BIZ 8), for who may change it: its creator
 * makes it private (« Rendre privé »), its owner or the direction share it
 * again; the deals it is shared with, and the journal of its shares,
 * take-backs and refusals for its owner and the direction.
 */
export function ContactPrivacy({
  contactId,
  ownerName,
  isPrivate,
  canMakePrivate,
  canMakeShared,
  deals,
  events,
}: {
  contactId: string;
  ownerName: string | null;
  isPrivate: boolean;
  canMakePrivate: boolean;
  canMakeShared: boolean;
  deals: { id: string; name: string }[];
  events: ContactPrivacyEvent[];
}) {
  return (
    <PageSection card id="confidentialite" title={t.section}>
      <div className="flex flex-col gap-4">
        <p className="text-body-md">
          {isPrivate ? t.privateState(ownerName) : t.sharedState}
        </p>
        {isPrivate && (
          <FactRows>
            {deals.length === 0 ? (
              <FactRow label={t.sharedWith} value={t.sharedNone} />
            ) : (
              deals.map((deal) => (
                <FactRow
                  key={deal.id}
                  label={t.sharedWith}
                  value={deal.name}
                  href={routes.deal(deal.id)}
                  hrefLabel={deal.name}
                />
              ))
            )}
          </FactRows>
        )}
        {events.length > 0 && (
          <details>
            <summary className="w-fit cursor-pointer text-body-md font-medium text-[color:var(--text-secondary)]">
              {t.journal}
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-body-sm">
              {events.map((e) => (
                <li key={e.id}>
                  {formatInstantDay(e.at)} · {t.events[e.kind] ?? e.kind}
                  {e.dealName && ` · ${e.dealName}`}
                  {e.actor && (
                    <span className="text-[color:var(--text-secondary)]">
                      {" "}
                      {t.by(e.actor)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
        {canMakePrivate && !isPrivate && (
          <ConfirmButton
            label={t.makePrivate}
            variant="outline"
            size="sm"
            title={t.makePrivateTitle}
            body={t.makePrivateBody}
            confirmLabel={t.makePrivate}
            pendingLabel={t.makePrivate}
            done={t.done.private}
            run={makeContactPrivate.bind(null, contactId)}
          />
        )}
        {canMakeShared && isPrivate && (
          <ConfirmButton
            label={t.makeShared}
            variant="outline"
            size="sm"
            title={t.makeSharedTitle}
            body={t.makeSharedBody}
            confirmLabel={t.makeShared}
            pendingLabel={t.makeShared}
            done={t.done.shared}
            run={makeContactShared.bind(null, contactId)}
          />
        )}
      </div>
    </PageSection>
  );
}

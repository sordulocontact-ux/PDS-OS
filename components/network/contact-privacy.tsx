import { PageSection } from "@/components/shell/page-section";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import { networkPrivacy } from "@/lib/i18n/fr/network-privacy";
import {
  makeContactPrivate,
  makeContactShared,
} from "@/lib/network/privacy-actions";

const t = networkPrivacy;

/**
 * Whether a contact is private (BIZ 8), for who may change it: its creator
 * makes it private (« Rendre privé »), its owner or the direction share it
 * again; the deals it is shared with.
 */
export function ContactPrivacy({
  contactId,
  ownerName,
  isPrivate,
  canMakePrivate,
  canMakeShared,
  deals,
}: {
  contactId: string;
  ownerName: string | null;
  isPrivate: boolean;
  canMakePrivate: boolean;
  canMakeShared: boolean;
  deals: { id: string; name: string }[];
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

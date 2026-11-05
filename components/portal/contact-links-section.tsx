import { emailEnabled } from "@/lib/email/send";
import { contactLinks } from "@/lib/i18n/fr/contact-links";
import { roles } from "@/lib/i18n/fr/roles";
import {
  loadContactLinks,
  type ContactLinkRow,
} from "@/lib/portal/contact-links";
import { formatDayMonth } from "@/lib/utils/instant";

import { ContactLinkActions } from "./contact-link-actions";

const fr = { roles, contactLinks };

const t = fr.contactLinks;
const l = fr.roles.links;

/** « Lien n° 1 actif · créé le 19/10 par Lina Haddad · envoyé le 19/10 ·
 * ouvert le 19/10 · valable jusqu'au 17/04 », or why there is none. */
function linkLine(row: ContactLinkRow): string {
  const k = row.link;
  if (!k)
    return row.revoked
      ? t.revokedLine(formatDayMonth(row.revoked.at), row.revoked.reason)
      : l.none;
  return [
    l.active(k.number),
    l.created(formatDayMonth(k.createdAt), k.createdBy),
    k.sentAt ? l.sent(formatDayMonth(k.sentAt)) : null,
    k.openedAt ? l.opened(formatDayMonth(k.openedAt)) : l.notOpened,
    l.expires(formatDayMonth(k.expiresAt)),
  ]
    .filter(Boolean)
    .join(" · ");
}

function Row({
  projectId,
  canEdit,
  row,
}: {
  projectId: string;
  canEdit: boolean;
  row: ContactLinkRow;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-[color:var(--border-hairline)] py-3 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span>
          <b className="font-semibold">{row.name}</b> ·{" "}
          {t.objects(row.items, row.todo)}
        </span>
        <span className="text-caption text-muted-foreground">
          {linkLine(row)}
        </span>
      </span>
      {canEdit && (
        <ContactLinkActions
          projectId={projectId}
          row={row}
          canEmail={emailEnabled() && !!row.email}
        />
      )}
    </li>
  );
}

/**
 * « Liens privés » of « Qui fait quoi » (lot 11): each person outside the
 * team who has something in this project, and their one link to all of
 * it. Server component: a module passes it to `RolesPanel` as
 * `personLinks`; `sub` when the module lists its own links above
 * (« Une page par personne » under them).
 */
export async function ContactLinksSection({
  projectId,
  sub = false,
}: {
  projectId: string;
  sub?: boolean;
}) {
  const { canEdit, rows } = await loadContactLinks(projectId);
  if (rows.length === 0) return null;
  const Title = sub ? "h4" : "h3";
  return (
    <section className="flex flex-col gap-2">
      <Title className={sub ? "font-semibold" : "text-body-md font-semibold"}>
        {sub ? t.title : l.title}
      </Title>
      <p className="text-caption text-muted-foreground">{t.hint}</p>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <Row
            key={row.contactId}
            projectId={projectId}
            canEdit={canEdit}
            row={row}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * Next to a workflow's own link (Master, fiche, provider): the same
 * person's page by project, to send instead of (or with) it.
 */
export async function ContactLinkOffer({
  projectId,
  contactId,
}: {
  projectId: string;
  contactId: string | null;
}) {
  if (!contactId) return null;
  const { canEdit, rows } = await loadContactLinks(projectId);
  const row = rows.find((r) => r.contactId === contactId);
  if (!row) return null;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span>{t.offer(row.name)}</span>
        <span className="text-caption text-muted-foreground">
          {linkLine(row)}
        </span>
      </span>
      {canEdit && (
        <ContactLinkActions
          projectId={projectId}
          row={row}
          canEmail={emailEnabled() && !!row.email}
        />
      )}
    </div>
  );
}

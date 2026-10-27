import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { roles } from "@/lib/i18n/fr/roles";
import { formatDayMonth } from "@/lib/utils/instant";

const fr = { roles };

const t = fr.roles.links;

/** The private link of someone without an account, as « Liens privés »
 * lists it. `url`: only when the module can give it again (a recoverable
 * token); otherwise the link is shown once, on « Nouveau lien ». */
export type PrivateLinkRow = {
  key: string;
  name: string;
  role: string;
  link: {
    number: number;
    createdAt: string;
    createdBy: string | null;
    sentAt?: string | null;
    openedAt: string | null;
    expiresAt?: string | null;
    revokedAt?: string | null;
    url?: string | null;
  } | null;
  // « Relancer » : a message to the person (mailto), when one can be written.
  remindHref?: string | null;
  // « Nouveau lien » of the module (replaces the former), owner only.
  renew?: React.ReactNode;
};

/**
 * « Liens privés » (proto BODY.org): for each person, the current link
 * (number, made when and by whom, sent, opened), « Copier le lien » when
 * it can be given again, « Relancer », « Nouveau lien ».
 */
export function PrivateLinks({
  links,
  children,
}: {
  links: PrivateLinkRow[];
  // Under the module's links: each person's page (`ContactLinksSection`).
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body-md font-semibold">{t.title}</h3>
      <p className="text-caption text-muted-foreground">{t.hint}</p>
      <ul className="flex flex-col">
        {links.map(({ key, name, role, link: l, remindHref, renew }) => (
          <li
            key={key}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-[color:var(--border-hairline)] py-3 first:border-t-0"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span>
                <b className="font-semibold">{name}</b> · {role}
              </span>
              <span className="text-caption text-muted-foreground">
                {!l
                  ? t.none
                  : l.revokedAt
                    ? t.revoked(formatDayMonth(l.revokedAt))
                    : [
                        t.active(l.number),
                        t.created(formatDayMonth(l.createdAt), l.createdBy),
                        l.sentAt ? t.sent(formatDayMonth(l.sentAt)) : null,
                        l.openedAt
                          ? t.opened(formatDayMonth(l.openedAt))
                          : t.notOpened,
                        l.expiresAt
                          ? t.expires(formatDayMonth(l.expiresAt))
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {l?.url && !l.revokedAt && (
                <CopyButton
                  value={l.url}
                  label={t.copy}
                  copiedLabel={t.copied}
                  size="sm"
                />
              )}
              {remindHref && l && !l.revokedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  render={<a href={remindHref} />}
                  nativeButton={false}
                >
                  {t.remind}
                </Button>
              )}
              {renew}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}

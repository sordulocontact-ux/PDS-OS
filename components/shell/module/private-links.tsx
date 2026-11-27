import { PersonLinkCard } from "@/components/ui/person-link-card";
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
    // Undefined: the module does not keep when it was sent (Production).
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
 * « Liens privés » (proto BODY.org): for each person, the current link as
 * THE link card (`PersonLinkCard`, Sacha 27/11/2026: never rows of their
 * own): role and validity under the name, where it stands in its pill,
 * the address to copy when it can be given again, « Relancer », the
 * module's « Nouveau lien ».
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
      <ul className="mt-1 flex flex-col gap-3">
        {links.map(({ key, name, role, link, remindHref, renew }) => {
          const live = link && !link.revokedAt ? link : null;
          return (
            <li key={key}>
              <PersonLinkCard
                name={name}
                line={[
                  role,
                  live?.expiresAt
                    ? t.expires(formatDayMonth(live.expiresAt))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                state={
                  !live
                    ? "none"
                    : live.openedAt
                      ? "opened"
                      : live.sentAt
                        ? "sent"
                        : "notSent"
                }
                badge={
                  live && !live.openedAt && live.sentAt === undefined
                    ? { tone: "neutral", label: t.notOpenedYet }
                    : undefined
                }
                url={live?.url ?? null}
                remindHref={live ? remindHref : null}
                tools={live ? renew : undefined}
                empty={
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[color:var(--text-secondary)]">
                      {link?.revokedAt
                        ? t.revoked(formatDayMonth(link.revokedAt))
                        : t.none}
                    </span>
                    {renew}
                  </div>
                }
              />
            </li>
          );
        })}
      </ul>
      {children}
    </section>
  );
}

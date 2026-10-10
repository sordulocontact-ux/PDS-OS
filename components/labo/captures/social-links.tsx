import type { SocialLink } from "@/lib/catalog/capture-artist-types";
import { fr } from "@/lib/i18n/fr";

/** TikTok and Instagram of a person, each with where it was found. */
export function SocialLinks({
  tiktok,
  instagram,
}: {
  tiktok: SocialLink | null;
  instagram: SocialLink | null;
}) {
  const t = fr.laboCaptures.socials;
  const links = [
    { network: t.tiktok, link: tiktok },
    { network: t.instagram, link: instagram },
  ].flatMap(({ network, link }) => (link ? [{ network, link }] : []));

  if (links.length === 0)
    return <p className="text-sm text-muted-foreground">{t.none}</p>;

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
      {links.map(({ network, link }) => (
        <div key={network} className="contents">
          <dt className="text-muted-foreground">{network}</dt>
          <dd className="min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold break-all underline-offset-4 hover:underline"
            >
              @{link.handle}
            </a>
            <span className="text-muted-foreground">
              {" "}
              · {t.source[link.source]}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

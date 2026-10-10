import type {
  CaptureEmail,
  SocialLink,
} from "@/lib/catalog/capture-artist-types";
import { fr } from "@/lib/i18n/fr";

/**
 * TikTok, Instagram, Spotify and e-mail of a person, each with its source.
 */
export function SocialLinks({
  tiktok,
  instagram,
  spotify,
  email,
}: {
  tiktok: SocialLink | null;
  instagram: SocialLink | null;
  spotify: SocialLink | null;
  email: CaptureEmail | null;
}) {
  const t = fr.laboCaptures.socials;
  const e = fr.laboCaptures.email;
  const links = [
    {
      network: t.tiktok,
      link: tiktok && { ...tiktok, from: t.source[tiktok.source] },
    },
    {
      network: t.instagram,
      link: instagram && { ...instagram, from: t.source[instagram.source] },
    },
    {
      network: t.spotify,
      link: spotify && { ...spotify, from: t.source[spotify.source] },
    },
    {
      network: e.label,
      link: email && {
        label: email.value,
        url: `mailto:${email.value}`,
        from: e.source[email.source],
      },
    },
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
              {...(link.url.startsWith("mailto:")
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="font-semibold break-all underline-offset-4 hover:underline"
            >
              {link.label}
            </a>
            <span className="text-muted-foreground"> · {link.from}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

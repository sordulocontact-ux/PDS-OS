import {
  IconAtSign,
  IconCalendarDays,
  IconCalendarStar,
  IconGlobePointer,
  IconLink,
  IconLocation2,
  IconPenWriting4,
  IconPhone,
  IconUser,
} from "nucleo-sharp-essential";
import Link from "next/link";

import { ContactFiche } from "@/components/network/contact-fiche";
import {
  SHEET_LINK,
  SheetBlock,
  SheetLine,
  SheetLines,
} from "@/components/ui/record-sheet";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";
import type { ContactSheetData } from "@/lib/network/sheet-types";
import { instagramUrl, tiktokUrl } from "@/lib/network/socials";
import type { NetworkContactRow } from "@/lib/network/types";
import { formatShortDate } from "@/lib/release/format";

const fr = { network };

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * « Coordonnées » (Accordee's « Details »): how to reach it, from its row at
 * once, then what the sheet read: first its fiche de renseignements and
 * its link (copy, send, new link) as on its page, then website, Instagram,
 * owner, next call, since when it is in the Réseau. A private contact hidden from the reader
 * says so instead.
 */
export function DetailsBlock({
  contact,
  data,
}: {
  contact: NetworkContactRow;
  data: ContactSheetData | null;
}) {
  const p = fr.network.page;
  const d = fr.network.sheet.details;
  const next = data?.calls.next;
  return (
    <SheetBlock title={d.title}>
      <SheetLines>
        {data?.fiche && (
          <SheetLine icon={IconPenWriting4} label={p.networkFiche.label}>
            <ContactFiche
              contactId={contact.id}
              fiche={data.fiche}
              canEmail={data.canEmailFiche}
            />
          </SheetLine>
        )}
        {data?.hidden ? (
          <SheetLine icon={IconUser} label={d.owner}>
            <span className="text-[color:var(--text-secondary)]">
              {d.hidden}
              {data.ownerName && ` · ${data.ownerName}`}
            </span>
          </SheetLine>
        ) : (
          <>
            {contact.email && (
              <SheetLine icon={IconAtSign} label={p.email}>
                <a href={`mailto:${contact.email}`} className={SHEET_LINK}>
                  {contact.email}
                </a>
              </SheetLine>
            )}
            {contact.phone && (
              <SheetLine icon={IconPhone} label={p.phone}>
                <a href={`tel:${contact.phone}`} className={SHEET_LINK}>
                  {contact.phone}
                </a>
              </SheetLine>
            )}
            {contact.city && (
              <SheetLine icon={IconLocation2} label={p.city}>
                {contact.city}
              </SheetLine>
            )}
            {data?.website && (
              <SheetLine icon={IconGlobePointer} label={p.website}>
                <a href={data.website} className={SHEET_LINK} {...external}>
                  {data.website.replace(/^https?:\/\//, "")}
                </a>
              </SheetLine>
            )}
            {contact.tiktok && (
              <SheetLine icon={IconLink} label={fr.network.form.tiktok}>
                <a
                  href={tiktokUrl(contact.tiktok)}
                  className={SHEET_LINK}
                  {...external}
                >
                  @{contact.tiktok}
                </a>
              </SheetLine>
            )}
            {data?.instagram && (
              <SheetLine icon={IconLink} label={fr.network.form.instagram}>
                <a
                  href={instagramUrl(data.instagram)}
                  className={SHEET_LINK}
                  {...external}
                >
                  @{data.instagram}
                </a>
              </SheetLine>
            )}
            {data?.ownerName && (
              <SheetLine icon={IconUser} label={d.owner}>
                {data.ownerName}
              </SheetLine>
            )}
          </>
        )}
        {data && (
          <SheetLine icon={IconCalendarDays} label={d.nextCall}>
            {next ? (
              <Link href={routes.call(next.id)} className={SHEET_LINK}>
                {`${next.title} · ${formatShortDate(next.at)}`}
              </Link>
            ) : (
              <span className="text-[color:var(--text-tertiary)]">
                {d.noNextCall}
              </span>
            )}
          </SheetLine>
        )}
        {data?.since && (
          <SheetLine icon={IconCalendarStar} label={d.since}>
            <span className="tabular-nums">{formatShortDate(data.since)}</span>
          </SheetLine>
        )}
      </SheetLines>
    </SheetBlock>
  );
}

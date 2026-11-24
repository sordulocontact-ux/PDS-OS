"use client";

import { IconOffice, IconUser } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { IconExpand } from "@/components/icons";
import { ContactActions } from "@/components/network/contact-actions";
import { DetailsBlock } from "@/components/network/sheet/sheet-details";
import { SheetIdentity } from "@/components/network/sheet/sheet-identity";
import { ContactSheetSections } from "@/components/network/sheet/sheet-sections";
import { buttonVariants } from "@/components/ui/button";
import { SideSheet } from "@/components/ui/side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecordSheetData } from "@/components/ui/use-record-sheet-data";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";
import { loadContactSheet } from "@/lib/network/sheet-actions";
import type { NetworkContactRow } from "@/lib/network/types";

const fr = { network };

/**
 * A contact of the Réseau opened from its row, in the side sheet (after
 * Accordee's person panel, Sacha 24/11/2026): the list stays in sight, ↑ ↓
 * go to the next one. Its name, what it does and its gestures come from the
 * row at once; « Avec PDS », its team, its linked records, its invoices and
 * the rest of its coordinates are read when it opens. No history: none on
 * screen (Ibé, 23/11/2026).
 */
export function ContactSheet({
  contacts,
  rights,
  index,
  onClose,
  onMove,
}: {
  contacts: NetworkContactRow[];
  rights: RecordRights;
  // The open row, null when the sheet is closed.
  index: number | null;
  onClose: () => void;
  onMove: (to: number) => void;
}) {
  const t = fr.network.sheet;
  const contact = index === null ? null : (contacts[index] ?? null);
  const loaded = useRecordSheetData(contact?.id ?? null, loadContactSheet);
  if (!contact || index === null) return null;
  const data = loaded && loaded !== "failed" ? loaded : null;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={contact.name}
      index={index}
      total={contacts.length}
      onMove={onMove}
      bar={{
        icon: contact.kind === "person" ? IconUser : IconOffice,
        actions: (
          <>
            <Link
              href={routes.networkContact(contact.id)}
              aria-label={t.expand}
              title={t.expand}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <IconExpand aria-hidden />
            </Link>
            <ContactActions contact={contact} rights={rights} size="icon-sm" />
          </>
        ),
      }}
    >
      <SheetIdentity contact={contact} />
      {loaded === undefined ? (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-label={t.loading}
        >
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : loaded === "failed" ? (
        <FormMessage kind="error">{t.loadFailed}</FormMessage>
      ) : (
        data && <ContactSheetSections data={data} />
      )}
      <DetailsBlock contact={contact} data={data} />
    </SideSheet>
  );
}

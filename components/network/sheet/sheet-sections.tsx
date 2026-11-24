import {
  IconCalendarDays,
  IconFile,
  IconFolderOpen,
  IconHandshake,
  IconOffice,
  IconStar,
  IconUsers2,
  IconUsersHeart,
} from "nucleo-sharp-essential";

import { IconDisc } from "@/components/icons";
import { InvoicesSheetBlock } from "@/components/invoices/invoices-sheet-block";
import { SheetSummaryCard } from "@/components/ui/record-sheet";
import {
  SheetItemList,
  SheetLinkedBlock,
  SheetPeopleBlock,
} from "@/components/ui/record-sheet-blocks";
import { network } from "@/lib/i18n/fr/network";
import type { ContactSheetData } from "@/lib/network/sheet-types";
import { formatShortDate } from "@/lib/release/format";

const fr = { network };
const s = fr.network.sheet;

/**
 * What a Réseau contact's side sheet reads when it opens (§ 6.7 bis), on
 * the shared blocks of a record's sheet: « Avec PDS » (Accordee's
 * relationship card, without a score), its team, its linked records, its
 * invoices.
 */
export function ContactSheetSections({ data }: { data: ContactSheetData }) {
  const w = s.withPds;
  const l = s.linked;
  const { open, late } = data.awaited;
  return (
    <>
      <SheetSummaryCard
        title={open > 0 ? w.awaited(open, late) : w.nothingAwaited}
        alert={late > 0}
        caption={
          data.calls.lastOn
            ? w.lastCall(formatShortDate(data.calls.lastOn))
            : w.noCall
        }
        lines={[
          {
            icon: IconCalendarDays,
            label: w.calls,
            count: data.pastCalls.length,
            list: <SheetItemList items={data.pastCalls} />,
          },
          {
            icon: IconFolderOpen,
            label: w.projects,
            count: data.projects.length,
          },
          {
            icon: IconDisc,
            label: w.credits,
            count: data.credits.length,
            list: <SheetItemList items={data.credits} />,
          },
          { icon: IconFile, label: w.contracts, count: data.contracts.length },
        ]}
      />
      <SheetPeopleBlock
        title={s.team.title}
        people={data.team.map((member, index) => ({
          id: member.personId,
          name: member.name,
          detail: s.team.calls(member.calls),
          badge: index === 0 && data.team.length > 1 ? s.team.closest : null,
        }))}
      />
      <SheetLinkedBlock
        title={l.title}
        rows={[
          {
            icon: IconOffice,
            label: l.organization,
            links: data.organization ? [data.organization] : [],
          },
          {
            icon: IconStar,
            label: l.artist,
            links: data.artist ? [data.artist] : [],
          },
          {
            icon: IconUsersHeart,
            label: l.managedArtists,
            links: data.managedArtists,
          },
          { icon: IconUsers2, label: l.members, links: data.members },
          { icon: IconFolderOpen, label: l.projects, links: data.projects },
          {
            icon: IconFile,
            label: l.contracts,
            links: data.contracts.map((c) => ({ ...c, badge: c.role })),
          },
          { icon: IconHandshake, label: l.deals, links: data.deals },
        ]}
      />
      <InvoicesSheetBlock title={s.invoices} invoices={data.invoices} />
    </>
  );
}

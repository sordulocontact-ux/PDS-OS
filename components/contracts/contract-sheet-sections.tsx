import {
  IconAlarmClock,
  IconCalendarDays,
  IconFile,
  IconFolderOpen,
  IconHandshake,
  IconMoneyBillCoin,
  IconPenWriting2,
  IconPenWriting4,
  IconStar,
  IconUser,
  IconUsers2,
} from "nucleo-sharp-essential";

import { FileSheetList } from "@/components/catalog/files/file-sheet-list";
import { InvoicesSheetBlock } from "@/components/invoices/invoices-sheet-block";
import { DueDate } from "@/components/ui/due-date";
import {
  SheetBlock,
  SheetLine,
  SheetLines,
  SheetSummaryCard,
} from "@/components/ui/record-sheet";
import {
  SheetLinkedBlock,
  SheetPeopleList,
} from "@/components/ui/record-sheet-blocks";
import { routes } from "@/lib/auth/redirects";
import type { ContractSheetData } from "@/lib/contracts/sheet-types";
import { awaitsDue, type ContractRow } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { formatShortDate } from "@/lib/release/format";

const fr = { contracts };
const s = fr.contracts.sheet;

/**
 * What a contract's side sheet reads when it opens (§ 6.7 bis, the
 * Réseau's model): « Maintenant » in the summary card, its parties (who
 * signs badged) and its files folded in it (Sacha 24/11/2026: a count, its
 * list on demand), then its linked records and its invoices.
 */
export function ContractSheetSections({ data }: { data: ContractSheetData }) {
  const l = s.linked;
  return (
    <>
      <SheetSummaryCard
        title={data.now.title}
        alert={data.now.late}
        caption={data.caption}
        lines={[
          {
            icon: IconUsers2,
            label: s.lines.parties,
            count: data.parties.length,
            list: (
              <SheetPeopleList
                compact
                people={data.parties.map((party) => ({
                  id: party.contactId,
                  name: party.name,
                  href: routes.networkContact(party.contactId),
                  detail: party.role,
                  badge: party.signer ? s.signs : null,
                }))}
              />
            ),
          },
          {
            icon: IconFolderOpen,
            label: s.lines.files,
            count: data.files.length,
            list: <FileSheetList files={data.files} />,
          },
          {
            icon: IconMoneyBillCoin,
            label: s.lines.invoices,
            count: data.invoices.length,
          },
        ]}
      />
      <SheetLinkedBlock
        title={l.title}
        rows={[
          {
            icon: IconFolderOpen,
            label: l.project,
            links: data.project ? [data.project] : [],
          },
          {
            icon: IconStar,
            label: l.artist,
            links: data.artist ? [data.artist] : [],
          },
          { icon: IconHandshake, label: l.deals, links: data.deals },
          {
            icon: IconFile,
            label: l.origin,
            links: data.origin ? [data.origin] : [],
          },
        ]}
      />
      <InvoicesSheetBlock title={s.invoices} invoices={data.invoices} />
    </>
  );
}

/**
 * « Informations » (the page's facts): from the row at once, then its
 * start, signature and notes once read.
 */
export function ContractInfoBlock({
  contract,
  data,
}: {
  contract: ContractRow;
  data: ContractSheetData | null;
}) {
  const p = fr.contracts.page;
  const facts = [
    { icon: IconFile, label: p.type, value: fr.contracts.types[contract.type] },
    { icon: IconUser, label: p.owner, value: contract.ownerName || null },
    {
      icon: IconAlarmClock,
      label: p.dueOn,
      value: contract.dueOn && (
        <DueDate
          dueOn={contract.dueOn}
          awaited={awaitsDue(contract.state)}
          fallback={formatShortDate(contract.dueOn)}
          showDate
        />
      ),
    },
    {
      icon: IconCalendarDays,
      label: s.startsOn,
      value: data?.startsOn && formatShortDate(data.startsOn),
    },
    {
      icon: IconCalendarDays,
      label: s.endsOn,
      value: contract.endsOn && formatShortDate(contract.endsOn),
    },
    {
      icon: IconPenWriting4,
      label: p.signedOn,
      value: data?.signedOn && formatShortDate(data.signedOn),
    },
    { icon: IconPenWriting2, label: p.notes, value: data?.notes },
  ].filter((fact) => Boolean(fact.value));
  return (
    <SheetBlock title={p.facts}>
      <SheetLines>
        {facts.map((fact) => (
          <SheetLine key={fact.label} icon={fact.icon} label={fact.label}>
            {fact.value}
          </SheetLine>
        ))}
      </SheetLines>
    </SheetBlock>
  );
}

"use client";

import dynamic from "next/dynamic";
import {
  IconEnvelopeOpen,
  IconFile,
  IconHandshake,
} from "nucleo-sharp-essential";
import Link from "next/link";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ContractRowActions } from "@/components/contracts/contract-row-actions";
import {
  ContractInfoBlock,
  ContractSheetSections,
} from "@/components/contracts/contract-sheet-sections";
import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import { IconExpand } from "@/components/icons";
import { emptyDraft } from "@/components/mailbox/mail-compose-draft";
import { Button, buttonVariants } from "@/components/ui/button";
import { SideSheet } from "@/components/ui/side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecordSheetData } from "@/components/ui/use-record-sheet-data";
import { routes } from "@/lib/auth/redirects";
import { loadContractSheet } from "@/lib/contracts/sheet-actions";
import type { ContractRow } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const MailComposeDialog = dynamic(() =>
  import("@/components/mailbox/mail-compose-dialog").then(
    (m) => m.MailComposeDialog,
  ),
);

const fr = { contracts };

/**
 * A contract opened from its row, in the side sheet (the Réseau's model,
 * docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis, Sacha 24/11/2026): the list stays
 * in sight, ↑ ↓ go to the next one. Its title, type, parties and state come
 * from the row at once; « Maintenant », its parties, linked records,
 * invoices and the rest of its information are read when it opens. Its
 * gestures (send, sign, validate) stay on its page, one click away.
 */
export function ContractSheet({
  contracts: rows,
  index,
  onClose,
  onMove,
}: {
  contracts: ContractRow[];
  // The open row, null when the sheet is closed.
  index: number | null;
  onClose: () => void;
  onMove: (to: number) => void;
}) {
  const t = fr.contracts;
  const s = t.sheet;
  const contract = index === null ? null : (rows[index] ?? null);
  const loaded = useRecordSheetData(contract?.id ?? null, loadContractSheet);
  const [writing, setWriting] = useState(false);
  if (!contract || index === null) return null;
  const data = loaded && loaded !== "failed" ? loaded : null;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={contract.title}
      index={index}
      total={rows.length}
      onMove={onMove}
      bar={{
        icon: IconHandshake,
        actions: (
          <>
            <Link
              href={routes.contract(contract.id)}
              aria-label={s.expand}
              title={s.expand}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <IconExpand aria-hidden />
            </Link>
            <ContractRowActions contract={contract} />
          </>
        ),
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-display-sm font-medium break-words">
            {contract.title}
          </p>
          <p className="text-[color:var(--text-secondary)]">
            {[t.types[contract.type], contract.parties.join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div>
          <ContractStateBadge state={contract.state} size="md" />
        </div>
        {(data?.pdf || data?.signerEmail) && (
          <div className="flex flex-wrap gap-2">
            {data.pdf && (
              <a
                href={data.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <IconFile aria-hidden data-icon="inline-start" />
                {s.document}
              </a>
            )}
            {data.signerEmail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWriting(true)}
              >
                <IconEnvelopeOpen aria-hidden data-icon="inline-start" />
                {s.email}
              </Button>
            )}
          </div>
        )}
      </div>
      {loaded === undefined ? (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-label={s.loading}
        >
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : loaded === "failed" ? (
        <FormMessage kind="error">{s.loadFailed}</FormMessage>
      ) : (
        data && <ContractSheetSections data={data} />
      )}
      <ContractInfoBlock contract={contract} data={data} />
      {writing && data?.signerEmail && (
        <MailComposeDialog
          open={writing}
          onOpenChange={setWriting}
          draft={{
            ...emptyDraft,
            envelope: { ...emptyDraft.envelope, to: data.signerEmail },
          }}
        />
      )}
    </SideSheet>
  );
}

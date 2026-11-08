import Link from "next/link";

import { ClearanceBody } from "@/components/legal/clearance/clearance-drawer";
import {
  ContractInvoice,
  type ContractInvoices,
} from "@/components/invoices/contract-invoice";
import { PersonLink } from "@/components/portal/person-link";
import { contractSignerDraft } from "@/lib/contracts/signer-email";
import { FormalityCard } from "@/components/legal/formalities/formality-card";
import { ContractPanel } from "@/components/legal/tracking/contract-panel";
import { FichePanel } from "@/components/legal/tracking/fiche-panel";
import { SplitPanel } from "@/components/legal/tracking/split-panel";
import { Button } from "@/components/ui/button";
import { NextCard } from "@/components/ui/next-card";
import type { ContractProof } from "@/lib/contracts/proof";
import { legal } from "@/lib/i18n/fr/legal";
import type { Clearances } from "@/lib/legal/clearance/types";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import type { BoardRow } from "@/lib/legal/plan/board";

const fr = { legal };

/**
 * One step of a démarche, done in place (a person's fiche, their contract,
 * a borrowing, a title's split, its SACEM bulletin): the panel the Suivi
 * used to open beside its line, now the body of the démarche's step.
 */
export async function DemarchePart({
  projectId,
  projectTitle,
  row,
  clearances,
  proof,
  cards,
  invoices,
  direction,
  owner,
}: {
  projectId: string;
  projectTitle: string;
  row: BoardRow;
  // The borrowings' context (who validates, the organization).
  clearances: Clearances;
  proof: Record<string, ContractProof>;
  cards: Record<string, ContractCardData>;
  invoices: ContractInvoices;
  direction: string;
  owner: string;
}) {
  const panel = row.panel;
  switch (panel.kind) {
    case "fiche":
      return (
        <FichePanel
          projectId={projectId}
          projectTitle={projectTitle}
          row={panel.row}
          personLink={
            <PersonLink
              projectId={projectId}
              projectTitle={projectTitle}
              contactId={panel.row.contactId}
            />
          }
        />
      );
    case "contract": {
      const contractId = panel.row.contract?.id;
      // The e-mail « Envoyer à … » will send, shown before it leaves.
      const draft =
        contractId && panel.row.state === "ready_for_signature"
          ? await contractSignerDraft(contractId)
          : null;
      const invoice = contractId ? invoices.byContract[contractId] : undefined;
      return (
        <ContractPanel
          projectId={projectId}
          projectTitle={projectTitle}
          row={panel.row}
          owner={owner}
          card={contractId ? (cards[contractId] ?? null) : null}
          invoice={
            invoice && (
              <ContractInvoice
                projectId={projectId}
                personName={panel.row.name}
                data={invoice}
                view={{ ...invoices.view, direction }}
              />
            )
          }
          canValidate={clearances.canValidate}
          organizationId={clearances.organizationId}
          direction={direction}
          draft={draft}
          personLink={
            panel.row.contract &&
            ["ready_for_signature", "signature_pending"].includes(
              panel.row.state,
            ) && (
              <PersonLink
                projectId={projectId}
                projectTitle={projectTitle}
                contactId={panel.row.contactId}
              />
            )
          }
          proof={
            panel.row.contract ? (proof[panel.row.contract.id] ?? null) : null
          }
        />
      );
    }
    case "split":
      return <SplitPanel projectId={projectId} split={panel.split} />;
    case "clearance":
      return (
        <ClearanceBody
          projectId={projectId}
          clearance={panel.clearance}
          context={clearances}
          directionName={direction}
          exchangesBelow
        />
      );
    case "sacem":
      return (
        <>
          {row.item?.current === "blocked" && (
            <NextCard
              kind="wait"
              label={fr.legal.panels.sacem.waits}
              title={row.badge.label}
            />
          )}
          <FormalityCard projectId={projectId} title={panel.title} />
        </>
      );
    case "link":
      return panel.href ? (
        <Button
          variant="outline"
          className="self-start"
          nativeButton={false}
          render={<Link href={panel.href} />}
        >
          {fr.legal.board.open}
        </Button>
      ) : null;
    default:
      return null;
  }
}

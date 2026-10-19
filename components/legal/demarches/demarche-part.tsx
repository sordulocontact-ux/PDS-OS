import Link from "next/link";

import { ClearanceBody } from "@/components/legal/clearance/clearance-drawer";
import { ContactLinkOffer } from "@/components/portal/contact-links-section";
import { FormalityCard } from "@/components/legal/formalities/formality-card";
import { ContractPanel } from "@/components/legal/tracking/contract-panel";
import { FichePanel } from "@/components/legal/tracking/fiche-panel";
import { SplitPanel } from "@/components/legal/tracking/split-panel";
import { Button } from "@/components/ui/button";
import { NextCard } from "@/components/ui/next-card";
import type { ContractProof } from "@/lib/contracts/proof";
import { fr } from "@/lib/i18n/fr";
import type { Clearances } from "@/lib/legal/clearance/types";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import type { BoardRow } from "@/lib/legal/plan/board";

/**
 * One step of a démarche, done in place (a person's fiche, their contract,
 * a borrowing, a title's split, its SACEM bulletin): the panel the Suivi
 * used to open beside its line, now the body of the démarche's step.
 */
export function DemarchePart({
  projectId,
  projectTitle,
  row,
  clearances,
  proof,
  cards,
  owner,
}: {
  projectId: string;
  projectTitle: string;
  row: BoardRow;
  // The borrowings' context (who validates, the organization).
  clearances: Clearances;
  proof: Record<string, ContractProof>;
  cards: Record<string, ContractCardData>;
  owner: string;
}) {
  const panel = row.panel;
  switch (panel.kind) {
    case "fiche":
      return (
        <>
          <FichePanel
            projectId={projectId}
            projectTitle={projectTitle}
            row={panel.row}
          />
          {panel.row.link && (
            <ContactLinkOffer
              projectId={projectId}
              contactId={panel.row.contactId}
            />
          )}
        </>
      );
    case "contract":
      return (
        <ContractPanel
          projectId={projectId}
          projectTitle={projectTitle}
          row={panel.row}
          owner={owner}
          card={
            panel.row.contract ? (cards[panel.row.contract.id] ?? null) : null
          }
          canValidate={clearances.canValidate}
          organizationId={clearances.organizationId}
          proof={
            panel.row.contract ? (proof[panel.row.contract.id] ?? null) : null
          }
        />
      );
    case "split":
      return <SplitPanel projectId={projectId} split={panel.split} />;
    case "clearance":
      return (
        <ClearanceBody
          projectId={projectId}
          clearance={panel.clearance}
          context={clearances}
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

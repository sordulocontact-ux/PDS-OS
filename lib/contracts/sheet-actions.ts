"use server";

import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import { requireApproved } from "@/lib/auth/dal";
import { contractNowTitle } from "@/lib/contracts/now-title";
import { isMine } from "@/lib/contracts/now";
import { loadContractPage } from "@/lib/contracts/page-data";
import { findContract } from "@/lib/contracts/queries";
import type { ContractSheetData } from "@/lib/contracts/sheet-types";
import { awaitsDue } from "@/lib/contracts/types";
import { dealName } from "@/lib/deals/names";
import { loadDeals } from "@/lib/deals/queries";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { contracts } from "@/lib/i18n/fr/contracts";
import { todayInParis } from "@/lib/insights/dates";
import { loadSheetInvoices } from "@/lib/invoices/sheet";
import { formatDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

// A contract's side sheet (ContractSheet), read when it opens: what its
// page knows (loadContractPage, the same read), condensed. The viewer's
// session reads it all; RLS leaves out what they may not see.

const f = contracts.now.facts;
const categories = catalogFiles.categories.contract;

/** null: the contract is gone or out of reach. */
export async function loadContractSheet(
  contractId: string,
): Promise<ContractSheetData | null> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(contractId).success) return null;
  const contract = await findContract(contractId);
  if (!contract) return null;
  const supabase = await createClient();
  const [data, invoices, dealRows, deals] = await Promise.all([
    loadContractPage(contract, access),
    loadSheetInvoices({ contractId }),
    supabase.from("deals").select("id").eq("contract_id", contractId),
    loadDeals(access),
  ]);
  const dealIds = new Set((dealRows.data ?? []).map((row) => row.id));
  const today = todayInParis();
  const sent = data.proof?.sent;
  const origin = data.origin;

  return {
    now: {
      title: contractNowTitle({
        kind: data.now,
        contract,
        directionName: data.direction,
        signerName: data.signer?.name ?? null,
        viaLink: sent?.via === "link",
      }),
      mine: isMine(data.now),
      late:
        awaitsDue(contract.state) &&
        contract.dueOn !== null &&
        contract.dueOn < today,
    },
    caption: sent
      ? f.sentLine(
          formatDate(sent.on),
          data.sentBy ?? "",
          sent.how ? (f.hows[sent.how] ?? sent.how.toLowerCase()) : "",
        )
      : null,
    pdf: data.pdf,
    signerEmail: data.signer?.email ?? null,
    parties: contract.partyList.map((party) => ({
      contactId: party.contactId,
      name: party.name,
      role: party.role,
      signer: party.contactId === data.signer?.contactId,
    })),
    files: data.library.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mime: file.mime,
      bytes: file.bytes,
      createdAt: file.createdAt,
      context:
        categories[file.category as keyof typeof categories] ??
        categories.other,
      openUrl: file.openUrl,
      downloadUrl: file.downloadUrl,
    })),
    project:
      contract.projectId && contract.projectTitle
        ? {
            id: contract.projectId,
            label: contract.projectTitle,
            href: routes.project(contract.projectId),
          }
        : null,
    artist:
      contract.artistId && contract.artistName
        ? {
            id: contract.artistId,
            label: contract.artistName,
            href: routes.artist(contract.artistId),
          }
        : null,
    deals: deals.deals
      .filter((deal) => dealIds.has(deal.id))
      .map((deal) => ({
        id: deal.id,
        label: dealName(deal),
        href: routes.deal(deal.id),
      })),
    origin: origin
      ? {
          id: origin.href,
          label:
            origin.kind === "agreement"
              ? (contract.projectTitle ?? "")
              : origin.element,
          href: origin.href,
        }
      : null,
    startsOn: contract.startsOn,
    signedOn: contract.signedOn,
    notes: contract.notes,
    invoices,
  };
}

// What the side sheet of a Réseau contact shows beyond its row (after
// Accordee's person panel, Sacha 24/11/2026), read when it opens
// (loadContactSheet). Every count, date and state is computed by the code.
// Client-safe.

import type { SheetInvoice } from "@/lib/invoices/sheet-types";
import type { NetworkFiche } from "@/lib/network/fiche";
import type { SheetItem, SheetLink } from "@/lib/ui/record-sheet";

export type ContactSheetData = {
  // When the contact entered the Réseau ("YYYY-MM-DD", Paris).
  since: string;
  // A private contact's owner (BIZ 8); its coordinates hidden from the
  // reader when `hidden`.
  ownerName: string | null;
  hidden: boolean;
  website: string | null;
  instagram: string | null;
  // Its own fiche de renseignements and its link, for who may manage it
  // (loadNetworkFiche), as on its page; may it be sent by e-mail.
  fiche: NetworkFiche | null;
  canEmailFiche: boolean;
  // « Avec PDS »: its calls, what its projects await from it.
  calls: {
    lastOn: string | null;
    next: { id: string; title: string; at: string } | null;
  };
  awaited: { open: number; late: number };
  // Folded under their counts in « Avec PDS »: its past calls (latest
  // first) and the titles it is credited on.
  pastCalls: SheetItem[];
  credits: SheetItem[];
  // « Qui le connaît »: the team's members of its calls, most calls first.
  team: { personId: string; name: string; calls: number }[];
  // « Fiches liées », each a link to its page.
  organization: SheetLink | null;
  artist: SheetLink | null;
  managedArtists: SheetLink[];
  members: SheetLink[];
  projects: SheetLink[];
  contracts: (SheetLink & { role: string | null; status: string })[];
  deals: (SheetLink & { stage: string })[];
  // « Ses factures »: the invoices it sent PDS, newest first.
  invoices: SheetInvoice[];
};

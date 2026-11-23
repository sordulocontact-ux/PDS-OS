import { ContactFicheActions } from "@/components/network/contact-fiche-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkFiche, NetworkFicheState } from "@/lib/network/fiche";
import { formatDate } from "@/lib/release/format";
import { legalFormTone } from "@/lib/ui/state-tones";

const t = network.page.networkFiche;

// The tone of a fiche's state, from the fiches' own (Juridique 02).
const TONE: Record<NetworkFicheState, string> = {
  link_generated: "link_generated",
  sent: "sent",
  opened: "sent",
  filled: "complete",
};

/**
 * A contact's own fiche de renseignements (Sacha, 23/11/2026): its state
 * and when, the link to copy or e-mail, « Nouveau lien ». Shown only to who
 * may manage it (`loadNetworkFiche` is null otherwise).
 */
export function ContactFiche({
  contactId,
  fiche,
  canEmail,
}: {
  contactId: string;
  fiche: NetworkFiche;
  // PDS OS can send e-mails and the contact has an address.
  canEmail: boolean;
}) {
  const state = t.states[fiche.state];
  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 modern:py-2">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{t.label}</span>
        <StatusBadge tone={legalFormTone[TONE[fiche.state]]} size="sm">
          {fiche.at ? t.on(state, formatDate(fiche.at)) : state}
        </StatusBadge>
      </span>
      <ContactFicheActions
        contactId={contactId}
        url={fiche.url}
        notSent={fiche.state === "link_generated"}
        canEmail={canEmail}
      />
    </div>
  );
}

import { IconCircleInfo } from "nucleo-sharp-essential";

import { DealCalls } from "@/components/deals/deal-calls";
import { DealContacts } from "@/components/deals/deal-contacts";
import { DealHistory } from "@/components/deals/deal-history";
import { DealInfo } from "@/components/deals/deal-info";
import { WORKS } from "@/components/deals/deal-todo-view";
import { PageSection } from "@/components/shell/page-section";
import { DialogButton } from "@/components/ui/dialog-button";
import type { DealCall } from "@/lib/deals/call-queries";
import type { DealContact } from "@/lib/deals/contact-queries";
import type { Deal, DealEvent } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { deals as t } from "@/lib/i18n/fr/deals";

/**
 * « Informations » beside a deal's title, as on a project's overview (Sacha
 * 23/11/2026: the « Dossier » tab read again what « À faire » shows): what
 * the deal is about and who negotiates it (« Changer » for who assigns), its
 * people and calls when its stage does not show them, and its history.
 */
export function DealInfoButton({
  deal,
  negotiators,
  contacts,
  calls,
  events,
}: {
  deal: Deal;
  negotiators: Record<string, string> | null;
  contacts: DealContact[];
  calls: DealCall[];
  events: DealEvent[];
}) {
  const s = t.page.sections;
  const shown = WORKS[deal.stage];
  return (
    <DialogButton
      label={s.info}
      icon={IconCircleInfo}
      title={s.info}
      description={t.page.infoDescription}
    >
      <div className="flex flex-col gap-6">
        <DealInfo deal={deal} negotiators={negotiators} />
        {!shown.includes("contacts") && (
          <PageSection id="infos-contacts" title={dealContacts.section}>
            <DealContacts
              dealId={deal.id}
              contacts={contacts}
              canWrite={false}
            />
          </PageSection>
        )}
        {!shown.includes("calls") && (
          <PageSection id="infos-calls" title={dealCalls.section}>
            <DealCalls calls={calls} />
          </PageSection>
        )}
        <PageSection id="infos-historique" title={s.history}>
          <DealHistory deal={deal} events={events} />
        </PageSection>
      </div>
    </DialogButton>
  );
}

import {
  IconEnvelopeOpen,
  IconPenWriting4,
  IconMoneyBillCoin,
  IconNodes,
  IconPhone,
  IconScale,
  IconSparkle3,
} from "nucleo-sharp-essential";

import type { QuickAction } from "@/lib/shell/quick-actions";

// Each action wears the icon of its section in the navigation
// (lib/ui/nav-items.ts), so the « + » and the ⌘K say where it goes.
export const QUICK_ACTION_ICONS: Record<QuickAction, typeof IconPhone> = {
  conversation: IconSparkle3,
  mail: IconEnvelopeOpen,
  expense: IconMoneyBillCoin,
  call: IconPhone,
  note: IconPenWriting4,
  contact: IconNodes,
  deal: IconScale,
};

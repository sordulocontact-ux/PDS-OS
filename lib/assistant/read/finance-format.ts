// Shared by PO's Finance readings (lib/assistant/read/finance*.ts).
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatAmount } from "@/lib/utils/money";

export const FINANCE_MAX_LINES = 15;

// Money in and out of the account says no « HT »; budgets are HT.
export const cash = (cents: number) => formatAmount(cents, { ht: false });
export const ht = (cents: number) => formatAmount(cents);

/** Today in Paris, never given to the model (docs/ASSISTANT.md § 4). */
export const parisToday = () => parisPlace(new Date()).day;

import "server-only";

import { budgetTool } from "@/lib/assistant/read/budget";
import { calendarTool } from "@/lib/assistant/read/calendar";
import { contractsTool } from "@/lib/assistant/read/contracts";
import { dealsTool } from "@/lib/assistant/read/deals";
import { distributionStatusTool } from "@/lib/assistant/read/distribution";
import { filesTool } from "@/lib/assistant/read/files";
import { legalStatusTool } from "@/lib/assistant/read/legal";
import { marketingStatusTool } from "@/lib/assistant/read/marketing";
import { masterStatusTool } from "@/lib/assistant/read/master";
import { networkTool } from "@/lib/assistant/read/network";
import { notificationsTool } from "@/lib/assistant/read/notifications";
import { searchEverythingTool } from "@/lib/assistant/read/search";
import { titleSheetTool } from "@/lib/assistant/read/title-sheet";
import type { Access } from "@/lib/auth/access";

/**
 * PO's reading of the whole app (docs/ASSISTANT.md § 3 quinquies): one
 * function per domain, each on the loader of its page, with the viewer's
 * session. `pagePath`: the project or title the question may mean.
 */
export function readTools(access: Access, pagePath: string | null) {
  return {
    search_everything: searchEverythingTool(),
    contracts: contractsTool(access, pagePath),
    legal_status: legalStatusTool(access, pagePath),
    title_sheet: titleSheetTool(access, pagePath),
    network: networkTool(),
    master_status: masterStatusTool(access, pagePath),
    distribution_status: distributionStatusTool(access, pagePath),
    marketing_status: marketingStatusTool(access, pagePath),
    budget: budgetTool(access, pagePath),
    calendar: calendarTool(access),
    files: filesTool(),
    notifications: notificationsTool(access),
    deals: dealsTool(access),
  };
}

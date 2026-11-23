import { NextResponse, type NextRequest } from "next/server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  EXPORT_TYPES,
  financeCsv,
  type ExportType,
} from "@/lib/finance/exports";
import { parisPlace } from "@/lib/utils/calendar-period";

/**
 * « Export comptable » (Ibé's ticket, lot 7): one CSV of Finance
 * (?type=depenses|factures|encaissements|banque), for whoever
 * reads Finance; the data read with their session.
 */
export async function GET(request: NextRequest) {
  const access = await requireApproved();
  if (!can(access, "read_finance"))
    return new NextResponse(null, { status: 403 });
  const type = request.nextUrl.searchParams.get("type");
  if (!EXPORT_TYPES.includes(type as ExportType))
    return new NextResponse(null, { status: 400 });
  const today = parisPlace(new Date()).day;
  const body = await financeCsv(type as ExportType, today);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pds-finance-${type}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

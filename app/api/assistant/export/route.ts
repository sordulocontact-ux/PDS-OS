import type { NextRequest } from "next/server";

import {
  EXPORT_LISTS,
  listCsv,
  mayExport,
  type ExportList,
} from "@/lib/assistant/exports/lists";
import { getAccess } from "@/lib/auth/dal";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { parisPlace } from "@/lib/utils/calendar-period";
import { csvFileName } from "@/lib/utils/csv";

/**
 * A list as CSV, asked from PO's answer (export_list, docs/ASSISTANT.md
 * § 3 sexies). Read with the viewer's session: RLS decides the rows,
 * read_finance Finance's lists.
 */
export async function GET(request: NextRequest) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const list = request.nextUrl.searchParams.get("list");
  if (!EXPORT_LISTS.includes(list as ExportList))
    return Response.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  if (!mayExport(access, list as ExportList))
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  const today = parisPlace(new Date()).day;
  const made = await listCsv(list as ExportList, today);
  if (!made)
    return Response.json({ ok: false, error: "read_failed" }, { status: 500 });
  const name = csvFileName(
    assistantShow.files.lists[list as ExportList],
    today,
  );
  return new Response(made.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

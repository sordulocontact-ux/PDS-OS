import "server-only";

import {
  parseCsv,
  readWorkbook,
  toTable,
  type ParsedTable,
} from "@/lib/activations/agency/parse";
import { ACTIVATION_FILE_BUCKET } from "@/lib/activations/model";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const e = fr.activationAgency.preview.errorsMessages;

export type SourceRead =
  { ok: true; table: ParsedTable } | { ok: false; error: string };

/** A Google Sheets link shared for reading : its CSV export, no account. */
async function readGoogleSheet(
  url: string,
  gid: string | null,
): Promise<SourceRead> {
  const id = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
  const tab = gid ?? /[#?&]gid=(\d+)/.exec(url)?.[1] ?? "0";
  if (!id) return { ok: false, error: e.unreadable };
  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${tab}`,
      {
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes("csv"))
      return { ok: false, error: e.unreadable };
    return { ok: true, table: toTable(parseCsv(await response.text())) };
  } catch {
    return { ok: false, error: e.unreadable };
  }
}

/** A file deposited in the activation's bucket, read with the user's
 * session : an Excel workbook (the tab named like the source) or a CSV. */
async function readDepositedFile(
  fileId: string,
  sheetName: string,
): Promise<SourceRead> {
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("activation_files")
    .select("path, file_name, mime")
    .eq("id", fileId)
    .single();
  if (!file) return { ok: false, error: e.unreadable };
  const name = file.file_name.toLowerCase();
  const isXlsx = name.endsWith(".xlsx") || file.mime.includes("spreadsheetml");
  const isCsv =
    name.endsWith(".csv") ||
    file.mime.includes("csv") ||
    file.mime === "text/plain";
  if (!isXlsx && !isCsv) return { ok: false, error: e.notSpreadsheet };
  const { data, error } = await supabase.storage
    .from(ACTIVATION_FILE_BUCKET)
    .download(file.path);
  if (error || !data) return { ok: false, error: e.unreadable };
  try {
    const table = isXlsx
      ? await readWorkbook(Buffer.from(await data.arrayBuffer()), sheetName)
      : toTable(parseCsv(await data.text()));
    return { ok: true, table };
  } catch {
    return { ok: false, error: e.unreadable };
  }
}

export function readSource(
  source: {
    kind: string;
    url: string | null;
    sheet_gid: string | null;
    label: string;
  },
  fileId: string | null,
): Promise<SourceRead> {
  if (source.kind === "google_sheet" && source.url)
    return readGoogleSheet(source.url, source.sheet_gid);
  if (fileId) return readDepositedFile(fileId, source.label);
  return Promise.resolve({
    ok: false,
    error: fr.activationAgency.errors.fileRequired,
  });
}

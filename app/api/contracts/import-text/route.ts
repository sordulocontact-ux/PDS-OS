import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import {
  MAX_SOURCE_BYTES,
  sourceExtensionOf,
} from "@/lib/legal/contracts/source-rules";
import { sourceText } from "@/lib/legal/contracts/source-text";

// The beginning of the text is enough to recognise a contract.
const MAX_TEXT = 20_000;

/**
 * The text of a contract dropped in « Nouveau contrat » (Sacha 26/11/2026:
 * the file first, the form filled from it): read here, never kept, so the
 * browser can fill the title, the type, the artist and the project
 * (lib/contracts/import-prefill.ts). A route, not a server action: a
 * contract's PDF often weighs more than a server action accepts (1 Mo).
 * The file itself is filed with the contract once it is created.
 */
export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved" || !can(access, "manage_contracts"))
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return Response.json({ ok: false, error: "no_file" }, { status: 400 });
  const ext = sourceExtensionOf(file.name);
  if (!ext || file.size === 0 || file.size > MAX_SOURCE_BYTES)
    return Response.json({ ok: true, text: null });
  try {
    const text = await sourceText(Buffer.from(await file.arrayBuffer()), ext);
    return Response.json({ ok: true, text: text?.slice(0, MAX_TEXT) ?? null });
  } catch (error) {
    // Unreadable (a scan, a damaged file): the form stays empty to fill.
    console.error("[contracts] import text:", (error as Error).message);
    return Response.json({ ok: true, text: null });
  }
}

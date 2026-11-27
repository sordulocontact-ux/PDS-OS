import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import {
  MAX_SOURCE_BYTES,
  sourceExtensionOf,
} from "@/lib/legal/contracts/source-rules";
import { documentFontOf } from "@/lib/legal/contracts/document-fonts";
import { docxFont, sourceText } from "@/lib/legal/contracts/source-text";

// A contract's whole text, shown beside the form; a longer one is cut.
const MAX_TEXT = 200_000;

/**
 * The text of a contract dropped in « Nouveau contrat » (Sacha 26/11/2026:
 * the file first, the form filled from it): read here, never kept, so the
 * browser can fill the title, the type, the artist and the project
 * (lib/contracts/import-prefill.ts) and show the contract beside them, in
 * its Word file's typeface. A route, not a server action: a
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
    return Response.json({ ok: true, text: null, font: null });
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = await sourceText(bytes, ext);
    const font = ext === "docx" ? documentFontOf(docxFont(bytes)) : null;
    return Response.json({
      ok: true,
      text: text?.slice(0, MAX_TEXT) ?? null,
      font,
    });
  } catch (error) {
    // Unreadable (a scan, a damaged file): the form stays empty to fill.
    console.error("[contracts] import text:", (error as Error).message);
    return Response.json({ ok: true, text: null, font: null });
  }
}

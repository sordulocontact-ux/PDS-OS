import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { externalDocOf } from "@/lib/strategy/documents/model";
import { documentHtml, escapeHtml } from "@/lib/strategy/documents/render";
import { createClient } from "@/lib/supabase/server";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Never indexed, never kept by a shared cache, no referrer: the token is
  // the key and the link can be revoked.
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  // The document is static HTML: no script runs in it.
  "Content-Security-Policy":
    "default-src 'none'; img-src https: http:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

/**
 * A shared Plan de sortie or Dossier de presse (ticket § 11, step 8, and
 * § 12), read without an account through get_shared_strategy_document: the
 * database checks the token, its expiry and its revocation. The Brief de
 * sortie (internal, with the budget) is never readable this way.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/d/[token]">,
) {
  const { token } = await params;
  const parsed = z.uuid().safeParse(token);
  const supabase = await createClient();
  const { data, error } = parsed.success
    ? await supabase.rpc("get_shared_strategy_document", {
        p_token: parsed.data,
      })
    : { data: null, error: null };
  if (error) console.error("[shared-document]:", error.message);
  const doc = externalDocOf((data as { content?: unknown } | null)?.content);
  if (!doc) {
    const t = fr.strategyDocs.share;
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(fr.app.name)}</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0"><p>${escapeHtml(t.unavailable)}</p></body></html>`,
      { status: 404, headers: HEADERS },
    );
  }
  return new Response(documentHtml(doc), { headers: HEADERS });
}

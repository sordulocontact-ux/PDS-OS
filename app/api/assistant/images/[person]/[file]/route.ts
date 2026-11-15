import {
  ASSISTANT_IMAGE_BUCKET,
  isAssistantImagePath,
} from "@/lib/assistant/image-rules";
import { getAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Shows an image joined to a question to PO, read with the viewer's session:
 * the bucket's policies give one's own images only, anyone else gets 404.
 * The address names a file that never changes (a uuid): kept by the browser.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ person: string; file: string }> },
) {
  const access = await getAccess();
  if (access.state !== "approved") return new Response(null, { status: 401 });

  const { person, file } = await params;
  const path = `${person}/${file}`;
  if (!isAssistantImagePath(path)) return new Response(null, { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ASSISTANT_IMAGE_BUCKET)
    .download(path);
  if (error || !data) return new Response(null, { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

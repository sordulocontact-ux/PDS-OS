import { getAccess } from "@/lib/auth/dal";
import { withInbox } from "@/lib/email/inbox";
import { attachmentsOf } from "@/lib/mailbox/queries";
import { createClient } from "@/lib/supabase/server";

// The mailbox is read over IMAP: more than a database read on a cold start.
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A file joined to a mail of the page « Mails », read from PO's mailbox on
 * demand. The mail is read in the viewer's session (RLS: their own, the
 * direction's all) and the part must be one of its own files.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/mailbox/[id]/attachments/[part]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id, part } = await params;
  if (!UUID.test(id))
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("mailbox_messages")
    .select("folder, message_id, imap_uid, attachments")
    .eq("id", id)
    .maybeSingle();
  const folder = data?.folder === "sent" ? "sent" : "inbox";
  const joined = data
    ? attachmentsOf(data.attachments).find((a) => a.part === part)
    : undefined;
  if (!data || !joined)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  const file = await withInbox(
    (inbox) =>
      inbox.attachment(
        { uid: data.imap_uid, messageId: data.message_id },
        part,
      ),
    { folder },
  ).catch((error: unknown) => {
    console.error(
      "mailbox attachment:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return null;
  });
  if (!file)
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });

  const name = file.name || joined.name;
  return new Response(new Blob([file.content as BlobPart]), {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

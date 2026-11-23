import { getAccess } from "@/lib/auth/dal";
import {
  getGmailAttachment,
  getGmailMessage,
} from "@/lib/integrations/google-gmail";
import { gmailAttachments } from "@/lib/mailbox/gmail";
import { gmailAccountOf } from "@/lib/mailbox/gmail-accounts";

const GMAIL_ID = /^[A-Za-z0-9]{6,64}$/;

/**
 * A file joined to a mail of « Mon Gmail », read from Gmail on demand: only
 * from one of the signed-in member's own accounts. The message is read again
 * first: Gmail gives a new attachment id at each reading.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/mailbox/gmail/[account]/[message]/[part]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { account: key, message, part } = await params;
  const account = GMAIL_ID.test(message)
    ? await gmailAccountOf(access, key)
    : null;
  if (!account)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  try {
    const token = await account.token();
    const file = gmailAttachments(
      (await getGmailMessage(token, message, "head")).payload,
    ).find((a) => a.part === part);
    if (!file)
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const content = await getGmailAttachment(token, message, file.attachmentId);
    return new Response(new Blob([content as BlobPart]), {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}

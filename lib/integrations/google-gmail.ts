import "server-only";

import { IntegrationError } from "@/lib/integrations/http";

/**
 * The single entry point of the Gmail API (read-only, `gmail.readonly`): a
 * member's own Gmail, read live with the token of their work account (the
 * domain's delegation) or of an account they connected (docs/ARCHITECTURE.md
 * § 4 quater). Nothing read here is stored: the page « Mails » shows it to
 * its owner only. Throws IntegrationError (`refused`, `unreachable`).
 */

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailHeader = { name: string; value: string };

export type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
};

export type GmailMessage = {
  id: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};

// The parts' tree without their content, four levels deep (a message with
// its alternatives and an attached message rarely goes further).
const partsMask = (depth: number): string =>
  `parts(partId,mimeType,filename,body(size,attachmentId)${
    depth > 1 ? `,${partsMask(depth - 1)}` : ""
  })`;
const LIST_FIELDS = `id,labelIds,snippet,internalDate,payload(headers,${partsMask(4)})`;

async function get<T>(token: string, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new IntegrationError("gmail", "unreachable");
  }
  if (!response.ok) {
    console.error(`gmail: ${response.status}`);
    throw new IntegrationError(
      "gmail",
      response.status >= 500 ? "unreachable" : "refused",
    );
  }
  return response.json() as Promise<T>;
}

/** The ids of the newest messages, received and sent (no spam, bin, draft). */
export async function listGmailIds(
  token: string,
  max: number,
): Promise<string[]> {
  const query = new URLSearchParams({
    maxResults: String(max),
    q: "-in:spam -in:trash -in:drafts",
    fields: "messages/id",
  });
  const body = await get<{ messages?: { id: string }[] }>(
    token,
    `/messages?${query}`,
  );
  return (body.messages ?? []).map((m) => m.id);
}

/** A message's head, snippet and parts' tree, without content (`head`), or
 * whole with its texts (`full`). */
export function getGmailMessage(
  token: string,
  id: string,
  mode: "head" | "full",
): Promise<GmailMessage> {
  const query = new URLSearchParams({ format: "full" });
  if (mode === "head") query.set("fields", LIST_FIELDS);
  return get<GmailMessage>(
    token,
    `/messages/${encodeURIComponent(id)}?${query}`,
  );
}

/** A file joined, by the attachment id of a message read just before (Gmail
 * gives a new one at each reading). */
export async function getGmailAttachment(
  token: string,
  messageId: string,
  attachmentId: string,
): Promise<Uint8Array> {
  const body = await get<{ data?: string }>(
    token,
    `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  return new Uint8Array(Buffer.from(body.data ?? "", "base64url"));
}

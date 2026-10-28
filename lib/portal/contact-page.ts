import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// The person's page by project (lot 11, shell.md E10): read by their token,
// without an account (get_contact_page). The database says which objects
// are theirs in this project, with each one's state, deadline and step;
// each object is then read through its own functions with the same token
// and its id (lib/portal/link-key.ts).

const text = z.string().nullable().catch(null);

const callDetail = z.object({
  title: z.string(),
  occurredAt: z.string(),
  endsAt: text,
  meetingUrl: text,
  agenda: z.array(z.string()).catch([]),
  participants: z.array(z.string()).catch([]),
  invitedBy: text,
  invitedAt: z.string(),
  summary: z
    .object({
      text: z.string(),
      version: z.number(),
      sentAt: z.string(),
      by: text,
    })
    .nullable()
    .catch(null),
});
export type ContactCallDetail = z.infer<typeof callDetail>;

const item = z.object({
  kind: z.enum([
    "master",
    "listen",
    "form",
    "split",
    "influence",
    "provider",
    "call",
  ]),
  id: z.uuid(),
  workflow: z.enum(["framing", "master", "legal", "marketing", "distribution"]),
  step: z.string(),
  state: z.enum(["todo", "waiting", "done"]),
  due: text,
  at: z.string(),
  detail: callDetail.optional(),
});
export type ContactItem = z.infer<typeof item>;

const schema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    project: z.string(),
    artist: text,
    format: text,
    person: z.string(),
    roles: z.array(z.string()).catch([]),
    owner: text,
    ownerRole: text,
    expiresAt: z.string(),
    // An item the page cannot read is left out, never the whole page.
    items: z.array(z.unknown()).transform((xs) =>
      xs.flatMap((x) => {
        const parsed = item.safeParse(x);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  }),
  z.object({ state: z.enum(["revoked", "expired"]) }),
]);
export type ContactPage = z.infer<typeof schema>;
export type OpenContactPage = Extract<ContactPage, { state: "open" }>;

const TOKEN = /^[0-9a-f]{64}$/;

/** Null when the token is malformed or unknown. */
export const getContactPage = trackedCache(
  async (token: string): Promise<ContactPage | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_contact_page", {
      p_token: token,
    });
    if (error) {
      console.error("getContactPage:", error.message);
      return null;
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success && data) console.error("getContactPage: unreadable");
    return parsed.success ? parsed.data : null;
  },
);

/** The person opened their page: counted, never read as an answer. */
export async function noteContactPageOpened(token: string): Promise<void> {
  if (!TOKEN.test(token)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_contact_link_opened", {
    p_token: token,
  });
  if (error) console.error("noteContactPageOpened:", error.message);
}

const requests = z.array(
  z.object({
    callId: z.uuid(),
    settled: z.boolean(),
    asked: z
      .array(
        z.object({
          id: z.uuid(),
          title: z.string(),
          due: text,
          doneAt: text,
        }),
      )
      .catch([]),
  }),
);
export type ContactCallRequests = z.infer<typeof requests>[number];

/**
 * After each call the person attended, whether PDS confirmed its suites and
 * what it asked of them (get_contact_call_requests): never the report.
 * Keyed by call. Empty when the token is unknown or closed.
 */
export const getContactCallRequests = trackedCache(
  async (token: string): Promise<Map<string, ContactCallRequests>> => {
    if (!TOKEN.test(token)) return new Map();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_contact_call_requests", {
      p_token: token,
    });
    if (error) {
      console.error("getContactCallRequests:", error.message);
      return new Map();
    }
    const parsed = requests.safeParse(data);
    return new Map(
      (parsed.success ? parsed.data : []).map((r) => [r.callId, r]),
    );
  },
);

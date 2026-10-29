import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Réseau (proto des pages, 29/10/2026): the projects each contact is in
// (network_contact_projects), and on a contact's page what they do in each
// one and what waits for them (contact_projects, the items of their private
// page, contact_page_items). Only the projects the viewer may see.

const title = z.object({
  contactId: z.string(),
  projectId: z.string(),
  title: z.string(),
});

/** Each contact's projects, by title; empty on failure (the column says
 * « — »). */
export async function loadContactProjectTitles(): Promise<
  Map<string, { id: string; title: string }[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("network_contact_projects");
  if (error) console.error("loadContactProjectTitles:", error.message);
  const rows = z
    .array(title)
    .catch([])
    .parse(data ?? []);
  const byContact = new Map<string, { id: string; title: string }[]>();
  for (const row of rows) {
    const list = byContact.get(row.contactId) ?? [];
    list.push({ id: row.projectId, title: row.title });
    byContact.set(row.contactId, list);
  }
  return byContact;
}

const text = z.string().nullable().catch(null);

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
  id: z.string(),
  step: z.string(),
  state: z.enum(["todo", "waiting", "done"]),
  due: text,
});
export type ContactProjectItem = z.infer<typeof item>;

const project = z.object({
  projectId: z.string(),
  title: z.string(),
  artist: text,
  team: z.array(z.string()).catch([]),
  // An item of an unknown kind is left out, not the whole project.
  items: z
    .array(z.unknown())
    .catch([])
    .transform((list) =>
      list.flatMap((x) => {
        const parsed = item.safeParse(x);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  link: z.object({ sentAt: text, openedAt: text }).nullable().catch(null),
});
export type ContactProject = z.infer<typeof project>;

/** What the contact does in each project the viewer may see. */
export async function loadContactProjects(
  contactId: string,
): Promise<ContactProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("contact_projects", {
    p_contact_id: contactId,
  });
  if (error) console.error("loadContactProjects:", error.message);
  return z
    .array(project)
    .catch([])
    .parse(data ?? []);
}

/** What waits for the contact: an item still to do, an invitation to a
 * call aside (it is not an action). */
export const isAwaited = (i: ContactProjectItem) =>
  i.state === "todo" && i.kind !== "call";

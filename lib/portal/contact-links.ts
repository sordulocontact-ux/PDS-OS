import "server-only";

import { cache } from "react";
import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { canEditProject } from "@/lib/projects/edit-access";
import { createClient } from "@/lib/supabase/server";

// « Liens privés » of « Qui fait quoi » (lot 11): the people outside the
// team who have something in this project, and each one's page by project
// (project_contact_links). The token is read back for the project's owner
// only (contact_link_token); everyone else sees when it was made, sent and
// opened.

export type ContactLinkRow = {
  contactId: string;
  name: string;
  email: string | null;
  // Their objects in the project, and how many wait for them.
  items: number;
  todo: number;
  link: {
    id: string;
    number: number;
    createdAt: string;
    createdBy: string | null;
    sentAt: string | null;
    openedAt: string | null;
    expiresAt: string;
    // « /c/<token> », for the owner only.
    path: string | null;
  } | null;
  // The last revocation by hand, when no link is active.
  revoked: { at: string; reason: string } | null;
};

export type ContactLinks = { canEdit: boolean; rows: ContactLinkRow[] };

const contacts = z.array(
  z.object({
    contactId: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    items: z.number(),
    todo: z.number(),
  }),
);

const fullName = (p: { first_name: string | null; last_name: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || null;

export const loadContactLinks = cache(
  async (projectId: string): Promise<ContactLinks> => {
    const supabase = await createClient();
    const [access, project, people, links] = await Promise.all([
      getAccess(),
      supabase
        .from("projects")
        .select("owner_person_id")
        .eq("id", projectId)
        .maybeSingle(),
      supabase.rpc("project_link_contacts", { p_project_id: projectId }),
      supabase
        .from("project_contact_links")
        .select(
          "id, contact_id, number, created_at, created_by, sent_at, last_opened_at, expires_at, revoked_at, revoke_reason",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
    if (people.error) console.error("loadContactLinks:", people.error.message);
    const parsed = contacts.safeParse(people.data ?? []);
    const canEdit =
      project.data !== null &&
      canEditProject(access, { ownerPersonId: project.data.owner_person_id });
    const rowsOf = links.data ?? [];
    const authors = [
      ...new Set(rowsOf.flatMap((l) => (l.created_by ? [l.created_by] : []))),
    ];
    const { data: names } = authors.length
      ? await supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", authors)
      : { data: [] };
    const nameOf = new Map((names ?? []).map((p) => [p.id, fullName(p)]));
    const active = rowsOf.filter((l) => l.revoked_at === null);
    const tokens = canEdit
      ? await Promise.all(
          active.map(async (l) => {
            const { data } = await supabase.rpc("contact_link_token", {
              p_link_id: l.id,
            });
            return [l.id, data] as const;
          }),
        )
      : [];
    const tokenOf = new Map(tokens);
    const rows = (parsed.success ? parsed.data : []).map((c) => {
      const l = active.find((x) => x.contact_id === c.contactId);
      const last = rowsOf.find(
        (x) => x.contact_id === c.contactId && x.revoked_at !== null,
      );
      const token = l ? tokenOf.get(l.id) : null;
      return {
        ...c,
        link: l
          ? {
              id: l.id,
              number: l.number,
              createdAt: l.created_at,
              createdBy: l.created_by
                ? (nameOf.get(l.created_by) ?? null)
                : null,
              sentAt: l.sent_at,
              openedAt: l.last_opened_at,
              expiresAt: l.expires_at,
              path: token ? `/c/${token}` : null,
            }
          : null,
        revoked:
          !l && last?.revoked_at && last.revoke_reason !== "replaced"
            ? { at: last.revoked_at, reason: last.revoke_reason ?? "" }
            : null,
      };
    });
    return { canEdit, rows };
  },
);

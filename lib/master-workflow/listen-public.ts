import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// The artist's listening (docs/projet-complet/master.md § 11), on their page
// by project (/c/): get_master_listen checks the link and that they are the
// project's artist, then gives each version in listening; its file is
// signed here (storage lets a page sign it while it is in listening).

const schema = z.object({
  project: z.string(),
  validator: z.string().nullable().catch(null),
  versions: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      stage: z.enum(["mix", "mastering"]),
      number: z.number(),
      fileName: z.string(),
      path: z.string(),
      at: z.string(),
      by: z.string().nullable().catch(null),
      mine: z
        .array(
          z.object({
            timecode: z.number().nullable(),
            body: z.string(),
            at: z.string(),
          }),
        )
        .catch([]),
    }),
  ),
});

export type ListenVersion = Omit<
  z.infer<typeof schema>["versions"][number],
  "path"
> & { url: string | null };

export type PublicListen = {
  project: string;
  validator: string | null;
  versions: ListenVersion[];
};

export async function getPublicListen(
  token: string,
): Promise<PublicListen | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_master_listen", {
    p_contact_token: token,
  });
  if (error) console.error("getPublicListen:", error.message);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return null;
  const paths = parsed.data.versions.map((v) => v.path);
  const signed = paths.length
    ? await supabase.storage.from("master-files").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlOf = new Map(
    (signed.data ?? []).flatMap((s) =>
      s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [],
    ),
  );
  return {
    project: parsed.data.project,
    validator: parsed.data.validator,
    versions: parsed.data.versions.map(({ path, ...v }) => ({
      ...v,
      url: urlOf.get(path) ?? null,
    })),
  };
}

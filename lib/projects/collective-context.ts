import "server-only";

import { can, type Access } from "@/lib/auth/access";
import type { ArtistOption } from "@/lib/catalog/types";
import { listSelectionOptions } from "@/lib/catalog/selections";
import {
  collectiveModelFormatId,
  houseArtistId,
  type CollectiveContext,
} from "@/lib/projects/collective-rules";
import type { ContentFormatOption } from "@/lib/projects/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * The « Projet collectif » option of the project form (lot 5 of
 * docs/pds-mic-plan.md), read with the viewer's session: the selections
 * (every member reads them), the house artist proposed as main artist (the
 * artist named like the organization: PDS) and the PDS Mic model's format.
 * Who does not create projects only converts the selections they hold
 * (`holder`); null when they may not create a collective at all.
 */
export async function loadCollectiveContext(
  access: Access,
  artists: ArtistOption[],
  formats: ContentFormatOption[],
): Promise<CollectiveContext | null> {
  const direction = can(access, "create_projects");
  if (!access.organizationId || !access.personId) return null;
  if (!direction && !can(access, "manage_catalog")) return null;
  const supabase = await createClient();
  const [selections, organization, me] = await Promise.all([
    listSelectionOptions(),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", access.organizationId)
      .maybeSingle(),
    direction
      ? null
      : supabase
          .from("people")
          .select("first_name, last_name")
          .eq("id", access.personId)
          .maybeSingle(),
  ]);
  if (organization.error)
    console.error("loadCollectiveContext:", organization.error.message);
  const held = direction
    ? selections
    : selections.filter((s) => s.holder.personId === access.personId);
  if (!direction && held.length === 0) return null;
  return {
    selections: held,
    houseArtistId: houseArtistId(artists, organization.data?.name ?? null),
    modelFormatId: collectiveModelFormatId(formats),
    holder: direction
      ? null
      : {
          personId: access.personId,
          name: me?.data
            ? personName(me.data.first_name, me.data.last_name)
            : "",
        },
  };
}

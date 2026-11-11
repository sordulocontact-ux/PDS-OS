"use server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { loadCollectiveContext } from "@/lib/projects/collective-context";
import type { CollectiveContext } from "@/lib/projects/collective-rules";
import type { CreativeMember } from "@/lib/projects/creatives";
import { listCreativePeople } from "@/lib/projects/creatives";
import { listContentFormats } from "@/lib/projects/content-formats";
import { listAssignablePeople } from "@/lib/projects/queries";
import type { ContentFormatOption } from "@/lib/projects/types";

// What the side panel needs to show the real form for a PO draft. Read with
// the user's session: the lists are what this person may pick from.

export async function loadArtistForm(
  artistId: string,
): Promise<ArtistDetail | null> {
  await requireApproved();
  return getArtist(artistId);
}

export async function loadMasterForm(): Promise<{ artists: ArtistOption[] }> {
  await requireApproved();
  return { artists: await listArtistOptions() };
}

export async function loadProjectForm(): Promise<{
  masters: MasterOption[];
  artists: ArtistOption[];
  managers: CreativeMember[];
  creatives: CreativeMember[];
  contentFormats: ContentFormatOption[];
  // « Projet collectif » (lot 5 of docs/pds-mic-plan.md), for who creates
  // projects (PO proposes a project to them only).
  collectiveContext: CollectiveContext | null;
}> {
  const access = await requireApproved();
  const organizationId = access.organizationId;
  const [masters, artists, managers, creatives, contentFormats] =
    await Promise.all([
      listMasterOptions(),
      listArtistOptions(),
      organizationId ? listAssignablePeople(organizationId) : [],
      organizationId ? listCreativePeople(organizationId) : [],
      listContentFormats(),
    ]);
  const collectiveContext = can(access, "create_projects")
    ? await loadCollectiveContext(access, artists, contentFormats)
    : null;
  return {
    masters,
    artists,
    managers,
    creatives,
    contentFormats,
    collectiveContext,
  };
}

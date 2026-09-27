"use server";

import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
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
  return { masters, artists, managers, creatives, contentFormats };
}

"use server";

import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { getMaster, listArtistOptions } from "@/lib/catalog/queries";
import {
  masterFormDefaults,
  type ArtistOption,
  type MasterDetail,
  type MasterFormDefaults,
} from "@/lib/catalog/types";

// What the "Modifier" modal of a list row needs, read with the user's session
// when it opens. null: gone, archived, or not visible.

export async function loadArtistEdit(
  artistId: string,
): Promise<ArtistDetail | null> {
  await requireApproved();
  return getArtist(artistId);
}

export type MasterEdit = {
  artists: ArtistOption[];
  master: MasterDetail;
  defaults: MasterFormDefaults;
};

export async function loadMasterEdit(
  masterId: string,
): Promise<MasterEdit | null> {
  await requireApproved();
  const [master, artists] = await Promise.all([
    getMaster(masterId),
    listArtistOptions(),
  ]);
  if (!master) return null;
  return {
    artists,
    master,
    defaults: masterFormDefaults(master),
  };
}

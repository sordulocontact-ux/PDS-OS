"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type {
  DeezerAccount,
  SocialLink,
} from "@/lib/catalog/capture-artist-types";
import { deezerAccountOf } from "@/lib/catalog/capture-deezer";
import { parseDeezerLink } from "@/lib/catalog/deezer-link";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import {
  instagramUrl,
  socialsOfDeezerArtist,
  spotifyUrl,
  tiktokUrl,
} from "@/lib/integrations/artist-socials";
import {
  getDeezerArtist,
  resolveDeezerShareLink,
} from "@/lib/integrations/deezer";
import { findContactsByAccounts } from "@/lib/network/queries";

/**
 * The Deezer account a person picks in the Labo for someone read on a
 * screenshot: one of the homonyms, or a pasted link (artist page or the
 * app's share link). Read again on Deezer by the server, only the id comes
 * from the browser; nothing is saved. With what the code knows of it: the
 * catalog artist on that profile, a Réseau contact holding it, and the
 * networks MusicBrainz / Wikidata link to it.
 */

export type ChosenDeezer =
  | {
      ok: true;
      account: DeezerAccount;
      socials: {
        tiktok: SocialLink | null;
        instagram: SocialLink | null;
        spotify: SocialLink | null;
      };
      contact: { id: string; name: string } | null;
    }
  | { ok: false; error: "invalid_link" | "not_found" | "unavailable" };

const inputSchema = z.union([
  z.object({ deezerId: z.number().int().positive() }),
  z.object({ link: z.string().trim().min(1).max(500) }),
]);

export async function chooseCaptureDeezer(
  input: { deezerId: number } | { link: string },
): Promise<ChosenDeezer> {
  await requireApproved();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_link" };

  try {
    const id = await idOf(parsed.data);
    if (id === null) return { ok: false, error: "invalid_link" };
    const artist = await getDeezerArtist(id);
    if (!artist) return { ok: false, error: "not_found" };

    const [existing, contacts, linked] = await Promise.all([
      findArtistsByDeezerIds([artist.id]),
      findContactsByAccounts({
        tiktok: [],
        instagram: [],
        deezer: [artist.id],
      }),
      socialsOfDeezerArtist(artist.id).catch(() => null),
    ]);
    const link = (
      network: "tiktok" | "instagram" | "spotify",
    ): SocialLink | null => {
      const found = linked?.[network];
      if (!found) return null;
      return network === "spotify"
        ? {
            label: artist.name,
            url: spotifyUrl(found.handle),
            source: found.source,
          }
        : {
            label: `@${found.handle}`,
            url:
              network === "tiktok"
                ? tiktokUrl(found.handle)
                : instagramUrl(found.handle),
            source: found.source,
          };
    };
    return {
      ok: true,
      account: {
        ...deezerAccountOf(artist),
        existing: existing.get(artist.id) ?? null,
      },
      socials: {
        tiktok: link("tiktok"),
        instagram: link("instagram"),
        spotify: link("spotify"),
      },
      contact: contacts.deezer.get(artist.id) ?? null,
    };
  } catch (error) {
    console.error("chooseCaptureDeezer:", error);
    return { ok: false, error: "unavailable" };
  }
}

async function idOf(
  input: { deezerId: number } | { link: string },
): Promise<number | null> {
  if ("deezerId" in input) return input.deezerId;
  const text = input.link;
  if (/^\d{1,12}$/.test(text)) return Number(text);
  const link = parseDeezerLink(text);
  if (link?.kind === "artist") return link.id;
  if (link?.kind === "share") return resolveDeezerShareLink(link.url);
  return null;
}

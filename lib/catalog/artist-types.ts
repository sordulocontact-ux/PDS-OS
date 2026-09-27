// Artist page types: the catalog record and what Deezer (and Wikipedia)
// says about the artist. Client-safe.

import type {
  ArtistOption,
  ArtistRelation,
  MasterOption,
} from "@/lib/catalog/types";

export type ArtistDetail = {
  id: string;
  organizationId: string;
  name: string;
  relation: ArtistRelation;
  legalName: string | null;
  countryCode: string | null;
  // Written by the team; null = the biography read from Deezer / Wikipedia.
  bio: string | null;
  notes: string | null;
  // The picture shown: the uploaded one (signed URL) or else Deezer's.
  pictureUrl: string | null;
  pictureSource: "upload" | "deezer" | null;
  // Deezer's picture, kept to come back to it after removing an upload.
  deezerPictureUrl: string | null;
  deezerId: number | null;
  deezerUrl: string | null;
  masters: MasterOption[];
  // Live projects linked to the artist's masters, among those the viewer
  // may see (RLS); a project holding two of them counts once.
  projectIds: string[];
};

// What Deezer (and Wikipedia for the biography) says about an artist,
// read live on the artist page. Every date and count comes from the code.
export const RELEASE_KINDS = ["album", "ep", "single", "compile"] as const;
export type ReleaseKind = (typeof RELEASE_KINDS)[number];

export type ArtistRelease = {
  id: number;
  title: string;
  kind: ReleaseKind;
  releaseDate: string | null;
  coverUrl: string | null;
  link: string;
  // Dated after today: announced on Deezer, not out yet.
  upcoming: boolean;
};

export type ArtistTopTrack = {
  id: number;
  title: string;
  durationSeconds: number;
  link: string;
  album: string;
  coverUrl: string | null;
};

export type RelatedArtist = {
  deezerId: number;
  name: string;
  pictureUrl: string | null;
  fans: number;
  link: string;
  // The catalog artist behind this Deezer profile, when there is one.
  existing: ArtistOption | null;
};

export type ArtistBio = {
  // Plain text, paragraphs separated by blank lines.
  text: string;
  source: "manual" | "deezer" | "wikipedia";
  // Who wrote it ("Music Story" on Deezer), when known.
  author: string | null;
  url: string | null;
  lang: "fr" | "en";
};

export type ArtistProfile = {
  fans: number;
  releases: ArtistRelease[];
  // Most recent release already out, of any kind / albums only.
  latestRelease: ArtistRelease | null;
  latestAlbum: ArtistRelease | null;
  topTracks: ArtistTopTrack[];
  related: RelatedArtist[];
  bio: ArtistBio | null;
};

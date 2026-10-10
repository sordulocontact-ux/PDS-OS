import type { CaptureArtist } from "@/lib/catalog/capture-artist-types";

/** A person read on a screenshot, on its way to the browser (Labo). */
export type Person = Pick<
  CaptureArtist,
  "names" | "artistName" | "role" | "reasoning" | "tiktok"
> & {
  // Artist names PO found inside a written name ("Theodora" in
  // "theodorabossladyy"): searched, never shown as read.
  searchNames: string[];
  // Words of the bio links, matched against releases (account only).
  clues: string[];
  // Links written on the screenshot, as read (account only).
  links: string[];
  // Handles as read on the screenshot, before any check.
  read: { tiktok: string | null; instagram: string | null };
};

export type Matched = Person &
  Pick<CaptureArtist, "status" | "account" | "others">;

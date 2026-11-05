import type {
  CaptureArtist,
  CaptureEmail,
} from "@/lib/catalog/capture-artist-types";

/** A person read on a screenshot, on its way to the browser (Labo). */
export type Person = Pick<
  CaptureArtist,
  "names" | "artistName" | "role" | "reasoning" | "tiktok" | "profile"
> & {
  // Artist names PO found inside a written name ("Theodora" in
  // "theodorabossladyy"): searched, never shown as read.
  searchNames: string[];
  // Words of the bio links, matched against releases (account only).
  clues: string[];
  // Links written on the screenshot, as read (account only).
  links: string[];
  // Handles as read on the screenshot (or in a shared link), before any check.
  read: { tiktok: string | null; instagram: string | null };
  // Where those handles come from.
  readFrom: "capture" | "link";
  // An Instagram written in the TikTok bio ("Ig: …"), read by the code.
  bioInstagram: string | null;
  // The first e-mail written on the screenshot (account only), then in the
  // TikTok bio.
  email: CaptureEmail | null;
  // The screenshot's lines, for the words that say "beatmaker" (account).
  writtenText: string;
  // PO's reading of what the person does.
  activity: "artist" | "beatmaker" | "both" | "unknown";
};

export type Matched = Person &
  Pick<CaptureArtist, "status" | "account" | "others" | "suggestion">;

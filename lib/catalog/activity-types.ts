// Artist activity log, as read on the Activity tab. Client-safe.

export const ACTIVITY_KINDS = [
  "artist_created",
  "artist_updated",
  "contact_added",
  "contact_updated",
  "contact_removed",
  "file_added",
  "file_removed",
  "master_created",
  "master_credited",
  "project_created",
  "project_linked",
  "project_transmitted",
  "project_accepted",
  "project_refused",
  "project_clarification_requested",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ARTIST_FIELDS = [
  "identity",
  "bio",
  "notes",
  "picture",
  "deezer",
] as const;
export type ArtistField = (typeof ARTIST_FIELDS)[number];

export const FILE_CATEGORIES = [
  "press",
  "photo",
  "contract",
  "audio",
  "other",
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

// What the trigger copied at the time of the event; every key is optional
// (names change, rows get deleted).
export type ActivityDetail = {
  name?: string;
  title?: string;
  version?: string;
  assignee?: string;
  role?: string;
  category?: FileCategory;
  fields?: ArtistField[];
};

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  createdAt: string;
  // Empty when the person is not visible to the viewer or the server acted.
  actorName: string;
  // Page to open: the master or the project the event is about.
  href: string | null;
  detail: ActivityDetail;
};

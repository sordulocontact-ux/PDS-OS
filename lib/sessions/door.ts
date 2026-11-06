import { routes } from "@/lib/auth/redirects";

/**
 * The doors to the same sessions, as for the calls (lib/calls/door.ts): the
 * Sessions studio page of the menu; a project, where its sessions open
 * inside it (its navigation and trail kept); an artist or a title, whose
 * sessions open on their own page with the way back to where they came
 * from (« ← J4y »), there being no frame of work to keep there. Only the
 * route context differs; the list and the page are the same components.
 * Client-safe.
 */
export type SessionDoor =
  | { kind: "sessions" }
  | { kind: "project"; projectId: string }
  | { kind: "artist"; artistId: string }
  | { kind: "title"; masterId: string };

// ?depuis=a.<artist id> / t.<title id>: the way back of the session page.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FROM = new RegExp(`^([at])\\.(${UUID})$`, "i");

/** Where a session opens from this door. */
export function sessionHref(door: SessionDoor, sessionId: string): string {
  switch (door.kind) {
    case "project":
      return routes.projectSession(door.projectId, sessionId);
    case "artist":
      return `${routes.session(sessionId)}?depuis=a.${door.artistId}`;
    case "title":
      return `${routes.session(sessionId)}?depuis=t.${door.masterId}`;
    case "sessions":
      return routes.session(sessionId);
  }
}

/** The list this door goes back to (after « Supprimer » too). */
export function sessionsHref(door: SessionDoor): string {
  switch (door.kind) {
    case "project":
      return routes.projectSessions(door.projectId);
    case "artist":
      return routes.artistSessions(door.artistId);
    case "title":
      return routes.master(door.masterId);
    case "sessions":
      return routes.sessions;
  }
}

/** The door a session page was opened from (`?depuis=`), else the menu's. */
export function sessionDoorOf(from: unknown): SessionDoor {
  const match = typeof from === "string" ? FROM.exec(from) : null;
  if (!match) return { kind: "sessions" };
  return match[1].toLowerCase() === "a"
    ? { kind: "artist", artistId: match[2] }
    : { kind: "title", masterId: match[2] };
}

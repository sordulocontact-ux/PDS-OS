import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SessionPageView } from "@/components/sessions/session-page/session-page";
import { sessionName } from "@/components/sessions/session-format";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { sessionDoorOf, type SessionDoor } from "@/lib/sessions/door";
import { getStudioSession } from "@/lib/sessions/queries";
import { allInOrder } from "@/lib/utils/parallel";

export async function generateMetadata({
  params,
}: PageProps<"/app/sessions/[sessionId]">): Promise<Metadata> {
  const { sessionId } = await params;
  const session = await getStudioSession(sessionId).catch(() => null);
  return session ? { title: `${sessionName(session)} · ${fr.app.name}` } : {};
}

// « ← J4y », « ← Nuit blanche », else « ← Toutes les sessions ».
async function backLabelOf(door: SessionDoor): Promise<string> {
  if (door.kind === "artist") {
    const artist = await getArtist(door.artistId).catch(() => null);
    if (artist) return fr.catalog.artist.backTo(artist.name);
  }
  if (door.kind === "title") {
    const master = await getMaster(door.masterId).catch(() => null);
    if (master) return fr.catalog.master.backTo(master.title);
  }
  return fr.sessions.page.back;
}

// A studio session from the menu, an artist or a title (?depuis=); inside
// a project, it opens at /app/projects/[id]/sessions/[sessionId].
export default async function SessionPage({
  params,
  searchParams,
}: PageProps<"/app/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const door = sessionDoorOf((await searchParams).depuis);
  const [access, session, backLabel] = await allInOrder([
    requireApproved(),
    getStudioSession(sessionId),
    backLabelOf(door),
  ]);
  if (!session) notFound();
  // An artist or a title it no longer names: back to the menu's list.
  return (
    <SessionPageView
      session={session}
      access={access}
      door={backLabel === fr.sessions.page.back ? { kind: "sessions" } : door}
      backLabel={backLabel}
    />
  );
}

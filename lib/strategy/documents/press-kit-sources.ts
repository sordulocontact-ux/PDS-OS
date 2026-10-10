import "server-only";

import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { fr } from "@/lib/i18n/fr";
import type { ProjectDetail } from "@/lib/projects/types";
import { platformOf } from "@/lib/release/platforms";
import { getProjectRelease } from "@/lib/release/queries";
import { versionsOf } from "@/lib/strategy/documents/model";
import {
  pressKitConfigOf,
  type PressContact,
  type PressKitConfig,
  type PressLink,
} from "@/lib/strategy/documents/press-kit-model";
import {
  narrativeOf,
  type PressKitInput,
} from "@/lib/strategy/documents/press-kit-input";
import type { StrategyDocuments } from "@/lib/strategy/documents/queries";
import { releasePlanConfigOf } from "@/lib/strategy/documents/release-plan-model";
import { projectArtist } from "@/lib/strategy/documents/release-plan-sources";
import type { StrategyData } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

const isHttps = (url: string | null | undefined): url is string =>
  Boolean(url && /^https:\/\/[^\s"'<>]+$/i.test(url));

export const pressKitVersions = (docs: StrategyDocuments) =>
  versionsOf(docs.documents, "press_kit").filter(
    (d) => d.state !== "superseded",
  );

/** The generator's saved choices (empty when none). */
export async function loadPressKitConfig(
  projectId: string,
): Promise<PressKitConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_document_drafts")
    .select("config")
    .eq("project_id", projectId)
    .eq("kind", "press_kit")
    .maybeSingle();
  return pressKitConfigOf(data?.config);
}

/** The Plan de sortie's direction, if chosen: the dossier starts from it. */
export async function releasePlanDirection(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_document_drafts")
    .select("config")
    .eq("project_id", projectId)
    .eq("kind", "release_plan")
    .maybeSingle();
  return releasePlanConfigOf(data?.config).direction;
}

/**
 * Everything the Dossier de presse starts from, read with the user's
 * session: the artist sheet (its typed bio, else Deezer's or Wikipédia's),
 * the masters, the release and the links it really has (never invented),
 * the owner as default press contact. No budget is read.
 */
export async function pressKitInput(
  project: ProjectDetail,
  kind: string,
  data: StrategyData,
): Promise<PressKitInput> {
  const supabase = await createClient();
  const t = fr.strategyPressKit.links.known;
  const [{ artist, masters }, release, owner] = await Promise.all([
    projectArtist(project.id),
    getProjectRelease(supabase, project.id).catch((error: Error) => {
      console.error("pressKitInput release:", error.message);
      return null;
    }),
    project.ownerPersonId
      ? supabase
          .from("people")
          .select("email")
          .eq("id", project.ownerPersonId)
          .maybeSingle()
      : null,
  ]);
  const auto =
    artist && !artist.bio?.trim() && artist.deezer_id
      ? (await getArtistProfile(artist.deezer_id))?.bio
      : null;
  const bio = artist?.bio?.trim()
    ? { text: artist.bio.trim(), source: "manual" as const }
    : auto
      ? { text: auto.text, source: auto.source }
      : null;

  const r = release?.release;
  const links: PressLink[] = [];
  const add = (label: string, url: string | null | undefined) => {
    if (isHttps(url) && !links.some((l) => l.url === url))
      links.push({ label, url });
  };
  if (r?.smartlink_enabled && r.smartlink_token)
    add(t.smartlink, `${siteUrl()}${routes.smartlink(r.smartlink_token)}`);
  add(t.confirmed, r?.online_confirmed_url);
  for (const link of release?.links ?? []) {
    const platform = platformOf(link.url);
    add(platform ? fr.release.platforms[platform] : link.platform, link.url);
  }
  add(fr.release.platforms.spotify, r?.spotify_url);
  add(t.deezerArtist, artist?.deezer_url);

  const contacts: PressContact[] = project.ownerName
    ? [
        {
          name: project.ownerName,
          role: fr.strategyPressKit.links.defaultRole,
          email: owner?.data?.email ?? "",
          phone: "",
        },
      ]
    : [];

  return {
    project: {
      title: project.title,
      artist: project.artistName,
      type: kind,
      releaseDate: data.referenceDate,
    },
    artist: artist
      ? {
          name: artist.name,
          bio,
          countryCode: artist.country_code,
          deezerUrl: isHttps(artist.deezer_url) ? artist.deezer_url : null,
        }
      : null,
    tracks: masters,
    upc: r?.upc ?? null,
    narrative: narrativeOf(data),
    knownLinks: links,
    defaultContacts: contacts,
  };
}

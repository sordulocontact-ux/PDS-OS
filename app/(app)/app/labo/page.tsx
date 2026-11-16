import { CaptureArtistsBench } from "@/components/labo/captures/capture-artists-bench";
import { ShareShortcut } from "@/components/labo/captures/share-shortcut";
import { PageSection } from "@/components/shell/page-section";
import { SectionFrame } from "@/components/shell/section-frame";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = { title: `${fr.laboCaptures.title} · ${fr.app.name}` };

/**
 * Features on trial before they enter the app, for every member. Today:
 * artists read on TikTok screenshots and found on Deezer, saved to the
 * Réseau by a person (« Ajouter au Réseau »).
 */
export default async function LaboPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string | string[]; coller?: string }>;
}) {
  const [access, params] = await Promise.all([requireApproved(), searchParams]);
  // ?url=… and ?coller=1: sent by the iPhone Raccourci (docs/ARCHITECTURE.md
  // § 10 bis); the link is only data, read by the link route.
  const sharedLink = typeof params.url === "string" ? params.url : null;
  const t = fr.laboCaptures;

  return (
    <SectionFrame title={t.title} description={t.description}>
      <ShareShortcut />
      <PageSection
        id="captures"
        title={t.section}
        description={t.sectionDescription}
      >
        <CaptureArtistsBench
          canAddToNetwork={can(access, "manage_network")}
          sharedLink={sharedLink}
          paste={params.coller === "1"}
        />
      </PageSection>
    </SectionFrame>
  );
}

import { CaptureArtistsBench } from "@/components/labo/captures/capture-artists-bench";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = { title: `${fr.laboCaptures.title} · ${fr.app.name}` };

/**
 * Features on trial before they enter the app, for every member. Today:
 * artists read on TikTok screenshots and found on Deezer. Nothing is saved.
 */
export default async function LaboPage() {
  await requireApproved();
  const t = fr.laboCaptures;

  return (
    <PageContainer>
      <PageHeader title={t.title} description={t.description} />
      <PageSection
        id="captures"
        title={t.section}
        description={t.sectionDescription}
      >
        <CaptureArtistsBench />
      </PageSection>
    </PageContainer>
  );
}

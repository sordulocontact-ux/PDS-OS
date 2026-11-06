import { SessionsTable } from "@/components/sessions/sessions-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FormMessage } from "@/components/auth/form-message";
import { sessions } from "@/lib/i18n/fr/sessions";
import type { StudioSessionRow } from "@/lib/sessions/types";

const fr = { sessions };

/**
 * « Sessions studio » on a title's Vue d'ensemble (Sacha, 06/11/2026): the
 * sessions it was worked in, where its report stands, each opening with the
 * way back to the title. For a maquette, where it was born. They are
 * attached and detached from the session's page or the Audio tab.
 */
export function TitleSessionsSection({
  masterId,
  rows,
  error,
}: {
  masterId: string;
  rows: StudioSessionRow[];
  error: boolean;
}) {
  const t = fr.sessions.onTitle;
  return (
    <PageSection
      card
      id="sessions-studio"
      title={fr.sessions.title}
      description={t.description}
    >
      {error ? (
        <FormMessage kind="error">{fr.sessions.loadError}</FormMessage>
      ) : rows.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <SessionsTable
          sessions={rows}
          door={{ kind: "title", masterId }}
          hide="artists"
        />
      )}
    </PageSection>
  );
}

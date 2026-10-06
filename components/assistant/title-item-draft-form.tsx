"use client";

import { Loading, type SavedLink } from "@/components/assistant/draft-forms";
import { ContributorForm } from "@/components/catalog/master-page/contributor-form";
import { DeclarationForm } from "@/components/catalog/master-page/declaration-form";
import { RightsForm } from "@/components/catalog/master-page/rights-form";
import { SessionForm } from "@/components/catalog/master-page/session-form";
import { SplitForm } from "@/components/catalog/master-page/split-form";
import { TrackForm } from "@/components/catalog/master-page/track-form";
import { loadTitleItemForm } from "@/lib/assistant/draft-record-actions";
import type { TitleItemDraft } from "@/lib/assistant/draft-records";
import { routes } from "@/lib/auth/redirects";

// The title page's own form for a title item draft, pre-filled by field
// name (MasterForm `defaults`); saved with the user's session.
export function TitleItemDraftForm({
  draft,
  onSaved,
  onCancel,
}: {
  draft: TitleItemDraft;
  onSaved: (saved: SavedLink) => void;
  onCancel: () => void;
}) {
  const { item, masterId, masterTitle, defaults } = draft;
  const href = {
    contributor: routes.masterCredits(masterId),
    session: routes.masterSessions(masterId),
    track: routes.masterSessions(masterId),
    split: routes.masterSplits(masterId),
    rights: routes.masterRights(masterId),
    declaration: routes.masterRights(masterId),
  }[item];
  const props = {
    masterId,
    defaults,
    onCancel,
    onDone: () => onSaved({ label: masterTitle, href }),
  };

  return (
    <Loading
      load={() => loadTitleItemForm(masterId, draft.splitKind, draft.organism)}
    >
      {(form) => {
        switch (item) {
          case "contributor":
            return <ContributorForm contributor={null} {...props} />;
          case "session":
            return <SessionForm session={null} {...props} />;
          case "track":
            return (
              <TrackForm track={null} sessions={form.sessions} {...props} />
            );
          case "split":
            return (
              <SplitForm
                split={null}
                kind={draft.splitKind}
                available={form.available}
                {...props}
              />
            );
          case "rights":
            return <RightsForm rights={form.rights} {...props} />;
          case "declaration":
            return draft.organism ? (
              <DeclarationForm
                organism={draft.organism}
                declaration={form.declaration}
                {...props}
              />
            ) : null;
        }
      }}
    </Loading>
  );
}

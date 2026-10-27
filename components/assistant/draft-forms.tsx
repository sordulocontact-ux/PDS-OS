"use client";

import type { ReactNode } from "react";

import { CreateMasterForm } from "@/components/catalog/create-master-form";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Loaded } from "@/components/ui/loaded";
import {
  loadMasterForm,
  loadProjectForm,
} from "@/lib/assistant/draft-form-actions";
import type { MasterDraft, ProjectDraft } from "@/lib/assistant/drafts";
import { routes } from "@/lib/auth/redirects";
import { matchByName } from "@/lib/assistant/fuzzy-name";
import { masterLabel, type Credit } from "@/lib/catalog/types";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

export type SavedLink = { label: string; href: string };

type FormProps<D> = {
  draft: D;
  onSaved: (saved: SavedLink) => void;
  onCancel: () => void;
};

/** The lists of a form are loading, failed, or ready. */
export function Loading<T>({
  load,
  children,
}: {
  load: () => Promise<T>;
  children: (data: T) => ReactNode;
}) {
  const t = fr.assistant.drafts;
  return (
    <Loaded load={load} loadingLabel={t.loading} errorLabel={t.loadFailed}>
      {children}
    </Loaded>
  );
}

// The real master form, pre-filled with the draft.
export function MasterDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<MasterDraft>) {
  const { credits, pendingCredits, ...defaults } = draft.values;
  return (
    <Loading load={loadMasterForm}>
      {({ artists }) => (
        <CreateMasterForm
          artists={artists}
          // An artist proposed in the same answer and created since is
          // picked here by its name (the list is read at opening).
          defaultCredits={[
            ...credits,
            ...(pendingCredits ?? []).flatMap((pending): Credit[] => {
              const artist = matchByName(artists, pending.name, (a) => a.name);
              return artist && !credits.some((c) => c.artistId === artist.id)
                ? [
                    {
                      artistId: artist.id,
                      name: artist.name,
                      role: pending.role,
                    },
                  ]
                : [];
            }),
          ]}
          defaults={defaults}
          masterId={draft.masterId ?? undefined}
          onCreated={(master) =>
            onSaved({
              label: masterLabel(master),
              href: routes.master(master.id),
            })
          }
          onCancel={onCancel}
        />
      )}
    </Loading>
  );
}

// The real project form, pre-filled with the draft.
export function ProjectDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<ProjectDraft>) {
  return (
    <Loading load={loadProjectForm}>
      {(lists) => (
        <CreateProjectForm
          {...lists}
          defaults={withPending(draft.values, lists)}
          projectId={draft.projectId ?? undefined}
          onSaved={(project) =>
            onSaved({ label: project.title, href: routes.project(project.id) })
          }
          onCancel={onCancel}
        />
      )}
    </Loading>
  );
}

/** The project's titles and artist proposed in the same answer and created
 * since, picked by their name in the lists read at opening (UX test of
 * 09/10/2026: artist → titles → project, nothing carried over). */
function withPending(
  values: ProjectDraft["values"],
  lists: Awaited<ReturnType<typeof loadProjectForm>>,
): ProjectDraft["values"] {
  const masterIds = [
    ...values.masterIds,
    ...(values.pendingMasters ?? []).flatMap((title) => {
      const master = matchByName(lists.masters, title, masterLabel);
      return master ? [master.id] : [];
    }),
  ];
  const artist =
    !values.artistId && values.pendingArtist
      ? matchByName(lists.artists, values.pendingArtist, (a) => a.name)
      : null;
  return {
    ...values,
    masterIds: [...new Set(masterIds)],
    artistId: values.artistId ?? artist?.id ?? null,
  };
}

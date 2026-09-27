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
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

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
  const { credits, ...defaults } = draft.values;
  return (
    <Loading load={loadMasterForm}>
      {({ artists }) => (
        <CreateMasterForm
          artists={artists}
          defaultCredits={credits}
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
          defaults={draft.values}
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

"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/ui/filter-panel";
import { core } from "@/lib/i18n/fr/core";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import {
  CONTACT_STATES,
  type ContactState,
  type TitleRecap,
} from "@/lib/projects/recap-rules";

const fr = { core, projectTitles };

/** Above « Titres » par artiste, on one line (Sacha 27/11/2026): the views
 * (« Par titre / Par artiste »), then the « Filtres » button (the artists
 * of some statuses) and « Effacer » while one is set. No artist counted:
 * the views alone. */
export function TitlesFilter({
  views,
  recap,
  filter,
  onFilter,
}: {
  views?: ReactNode;
  recap: TitleRecap;
  filter: ContactState[];
  onFilter: (filter: ContactState[]) => void;
}) {
  const r = fr.projectTitles.recap;
  const total = CONTACT_STATES.reduce((sum, s) => sum + recap.counts[s], 0);
  if (!views && total === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {views}
      {total > 0 && (
        <>
          <FilterPanel
            align="start"
            filters={[
              {
                key: "status",
                label: r.columns.status,
                allLabel: r.allStates,
                options: CONTACT_STATES.filter(
                  (state) => recap.counts[state] > 0,
                ).map((state) => ({
                  value: state,
                  label: r.contactStates[state],
                })),
                values: filter,
                onChange: (values) =>
                  onFilter(
                    CONTACT_STATES.filter((state) => values.includes(state)),
                  ),
              },
            ]}
          />
          {filter.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onFilter([])}>
              {fr.core.urlFilters.clear}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

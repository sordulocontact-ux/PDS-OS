"use client";

import { FieldError } from "@/components/auth/form-message";
import { SearchSelect } from "@/components/ui/search-select";
import type { NewDealOptions } from "@/lib/deals/new-deal-options";
import { deals } from "@/lib/i18n/fr/deals";
import { cn } from "@/lib/utils";

const fr = { deals };

export type NewDealSubject = "participation" | "project" | "artist";

/**
 * What a new deal is about (BIZ 4): a participation of a collective, else a
 * project and/or an artist. For a music deal they are required as the
 * database asks (the direction may name an artist alone, a project manager
 * his project, the business manager an artist); beside a label or a brand
 * they are optional (Ibé 18/11/2026). `missing`: the form's missing
 * choices, in red.
 */
export function NewDealSubjectFields({
  options,
  music,
  byParticipation,
  values,
  onChange,
  missing,
}: {
  options: NewDealOptions;
  music: boolean;
  byParticipation: boolean;
  values: Record<NewDealSubject, string>;
  onChange: (field: NewDealSubject, value: string) => void;
  missing: string[];
}) {
  const t = fr.deals.create;
  const projectRequired = music && !options.artistAlone;
  const artistRequired = music && options.own;
  // An optional choice can be taken back: « Aucun projet » first, as the
  // other optional menus of the app (Finance, a task's project).
  const optional = (none: string, list: Record<string, string>) => ({
    "": none,
    ...list,
  });
  return byParticipation ? (
    <div className="flex flex-col gap-1.5">
      <SearchSelect
        id="new-deal-participation"
        label={t.participation}
        options={options.participations}
        value={values.participation}
        onChange={(v) => {
          onChange("participation", v);
        }}
        placeholder={t.participationPlaceholder}
        searchPlaceholder={t.participationSearch}
        emptyLabel={t.participationEmpty}
        required
        invalid={missing.includes("participation")}
        describedBy="new-deal-participation-error"
        fill
      />
      {missing.includes("participation") ? (
        <FieldError id="new-deal-participation-error">
          {t.required.participation}
        </FieldError>
      ) : (
        <p className="text-xs text-muted-foreground">{t.participationHint}</p>
      )}
    </div>
  ) : (
    <>
      {/* The business manager opens an artist's deal: no project. */}
      <div className={cn("flex flex-col gap-1.5", options.own && "hidden")}>
        <SearchSelect
          id={options.artistAlone ? "new-deal-subject" : "new-deal-project"}
          label={t.project}
          options={
            projectRequired
              ? options.projects
              : optional(t.noProject, options.projects)
          }
          value={values.project}
          onChange={(v) => {
            onChange("project", v);
          }}
          placeholder={t.projectPlaceholder}
          searchPlaceholder={t.projectSearch}
          emptyLabel={t.projectEmpty}
          required={projectRequired}
          invalid={music && missing.length > 0}
          describedBy="new-deal-subject-error"
          fill
        />
        <FieldError id="new-deal-subject-error">
          {missing.includes("project")
            ? t.required.project
            : missing.includes("subject")
              ? t.required.subject
              : undefined}
        </FieldError>
      </div>
      <div className="flex flex-col gap-1.5">
        <SearchSelect
          id="new-deal-artist"
          label={t.artist}
          options={
            artistRequired
              ? options.artists
              : optional(t.noArtist, options.artists)
          }
          value={values.artist}
          onChange={(v) => {
            onChange("artist", v);
          }}
          placeholder={t.artistPlaceholder}
          searchPlaceholder={t.artistSearch}
          emptyLabel={t.artistEmpty}
          required={artistRequired}
          invalid={artistRequired && missing.length > 0}
          describedBy={artistRequired ? "new-deal-artist-error" : undefined}
          fill
        />
        {artistRequired && (
          <FieldError id="new-deal-artist-error">
            {missing.length > 0 ? t.required.artist : undefined}
          </FieldError>
        )}
      </div>
    </>
  );
}

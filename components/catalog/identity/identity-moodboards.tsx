"use client";

import { IconFolderOpen, IconPlus } from "nucleo-sharp-essential";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  MoodboardFolder,
  type OpenFolder,
} from "@/components/catalog/identity/moodboard-folder";
import {
  FigmaImportForm,
  MoodboardForm,
} from "@/components/catalog/identity/moodboard-forms";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type CatalogFile,
  type FileWriteScope,
} from "@/lib/catalog/file-rules";
import {
  type ArtistMoodboard,
  canWriteMoodboard,
} from "@/lib/catalog/moodboard-rules";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { artistIdentity };

// The « Non classés » pseudo-folder.
const LOOSE = "loose";
const PARAM = "moodboard";

/**
 * « Moodboards » of the Identité tab (retours du 31/10 et du 10/11/2026):
 * the artistic director's pistes as folders, newest first, each with a
 * glimpse of its images; a click opens it in place. « Nouveau moodboard »
 * and « Importer depuis Figma » for whoever may write (`organizationId`:
 * the Catalogue, the creative directors; `scope`: a creative director edits
 * his own folders and images only; `figma`: a Figma token is set).
 */
export function IdentityMoodboards({
  artistId,
  moodboards,
  loose,
  organizationId,
  scope,
  figma,
}: {
  artistId: string;
  moodboards: ArtistMoodboard[];
  loose: CatalogFile[];
  organizationId: string | null;
  scope: FileWriteScope | null;
  figma: boolean;
}) {
  const t = fr.artistIdentity.moodboards;
  // The folder opened lives in the address (« ?moodboard=… »): it survives a
  // reload, can be sent as a link, and « Précédent » goes back to the grid.
  const openId = useSearchParams().get(PARAM);
  const setOpenId = (id: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set(PARAM, id);
    else params.delete(PARAM);
    const query = params.toString();
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}#identity-moodboards`,
    );
  };
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const opened: OpenFolder | null =
    openId === LOOSE && loose.length > 0
      ? {
          id: null,
          title: t.loose,
          note: null,
          sourceUrl: null,
          files: loose,
          canEdit: false,
        }
      : (() => {
          const folder = moodboards.find((m) => m.id === openId);
          return folder
            ? {
                ...folder,
                canEdit:
                  organizationId !== null && canWriteMoodboard(folder, scope),
              }
            : null;
        })();

  if (opened)
    return (
      <MoodboardFolder
        // A new folder starts fresh (its dialogs and viewer closed).
        key={opened.id ?? LOOSE}
        artistId={artistId}
        folder={opened}
        organizationId={organizationId}
        scope={scope}
        onBack={() => setOpenId(null)}
      />
    );

  const cards = [
    ...moodboards.map((m) => ({
      key: m.id,
      title: m.title,
      files: m.files,
      meta: t.by(formatInstantDay(m.createdAt), m.authorName),
      figma: Boolean(m.sourceUrl),
    })),
    ...(loose.length > 0
      ? [
          {
            key: LOOSE,
            title: t.loose,
            files: loose,
            meta: t.looseNote,
            figma: false,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {organizationId && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setCreating(true)}>
            <IconPlus aria-hidden data-icon="inline-start" />
            {t.create}
          </Button>
          {figma && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImporting(true)}
            >
              {t.figma.action}
            </Button>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyNote>
          {t.empty} {organizationId ? t.emptyHint : null}
        </EmptyNote>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.key} className="min-w-0">
              <button
                type="button"
                aria-label={t.openFolder(card.title)}
                onClick={() => setOpenId(card.key)}
                className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card text-left transition-colors hover:border-[color:var(--border-strong)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <FolderCover files={card.files} />
                <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {card.title}
                    </span>
                    {card.figma && (
                      <StatusBadge size="sm">{t.fromFigma}</StatusBadge>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t.count(card.files.length)} · {card.meta}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title={t.form.createTitle}
        description={t.form.createBody}
        closeLabel={t.confirm.close}
      >
        <MoodboardForm
          artistId={artistId}
          onDone={() => setCreating(false)}
          onCreated={setOpenId}
        />
      </FormDialog>
      <FormDialog
        open={importing}
        onOpenChange={setImporting}
        title={t.figma.title}
        description={t.figma.body}
        closeLabel={t.confirm.close}
      >
        <FigmaImportForm
          artistId={artistId}
          onDone={() => setImporting(false)}
        />
      </FormDialog>
    </div>
  );
}

/** Four images of the folder side by side, one alone, or a folder icon. */
function FolderCover({ files }: { files: CatalogFile[] }) {
  const shown = files.flatMap((file) =>
    file.previewUrl ? [file.previewUrl] : [],
  );
  const tiles = shown.length >= 4 ? shown.slice(0, 4) : shown.slice(0, 1);
  return (
    <div
      className={
        tiles.length === 4
          ? "grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-px overflow-hidden bg-[color:var(--border-hairline)]"
          : "flex aspect-[4/3] items-center justify-center bg-muted/40"
      }
    >
      {tiles.length === 0 ? (
        <IconFolderOpen aria-hidden className="size-10 text-muted-foreground" />
      ) : (
        tiles.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL, not an optimisable asset
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            className="size-full min-h-0 object-cover"
          />
        ))
      )}
    </div>
  );
}

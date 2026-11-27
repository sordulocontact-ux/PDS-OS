"use client";

import type { RefObject } from "react";

import { NoteLinkMenu } from "@/components/notes/note-link-menu";
import { NoteLinkPill } from "@/components/notes/note-link-pill";
import type { NoteDraft } from "@/components/notes/use-note-autosave";
import { Timestamp } from "@/components/ui/timestamp";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";
import type { NotePerson } from "@/lib/notes/views";

const fr = { notes };

/**
 * A written note as a document (Sacha 27/11/2026, after Accordee): « Lier
 * à… » on top, the title large, its author and last change, the pill of
 * what it is linked to (« × » unlinks it), then its text. `onChange`: its
 * author writes in place (no border, no button: NoteSheet saves as he
 * types); without it, the note is read. `titleRef`: its title field (a new
 * note's sheet gives it the focus).
 */
export function NoteDocument({
  draft,
  author,
  editedAt,
  choices = null,
  onChange,
  titleRef,
}: {
  draft: NoteDraft;
  author: NotePerson;
  editedAt: string | null;
  choices?: NoteLinkChoices | null;
  onChange?: (patch: Partial<NoteDraft>) => void;
  titleRef?: RefObject<HTMLInputElement | null>;
}) {
  const t = fr.notes.document;
  return (
    <div className="flex flex-col gap-5">
      {onChange && (
        <NoteLinkMenu choices={choices} onPick={(link) => onChange({ link })} />
      )}
      <div className="flex flex-col gap-1.5">
        {onChange ? (
          <input
            ref={titleRef}
            aria-label={t.title}
            value={draft.title}
            maxLength={200}
            placeholder={fr.notes.untitled}
            onChange={(event) => onChange({ title: event.target.value })}
            className="w-full bg-transparent text-display-lg font-medium outline-none placeholder:text-[color:var(--text-tertiary)]"
          />
        ) : (
          <p className="text-display-lg font-medium break-words">
            {draft.title}
          </p>
        )}
        <p className="text-[color:var(--text-secondary)]">
          {author.name}
          {editedAt && (
            <>
              {" · "}
              {t.edited} <Timestamp iso={editedAt} />
            </>
          )}
        </p>
      </div>
      {(draft.link || !onChange) && (
        <div className="flex">
          <NoteLinkPill
            link={draft.link}
            open
            size="md"
            onRemove={onChange && (() => onChange({ link: null }))}
          />
        </div>
      )}
      {onChange ? (
        <textarea
          aria-label={t.body}
          value={draft.body}
          maxLength={20000}
          placeholder={t.bodyPlaceholder}
          onChange={(event) => onChange({ body: event.target.value })}
          className="field-sizing-content min-h-48 w-full resize-none bg-transparent break-words text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-tertiary)]"
        />
      ) : (
        <p className="break-words whitespace-pre-wrap text-[color:var(--text-primary)]">
          {draft.body}
        </p>
      )}
    </div>
  );
}

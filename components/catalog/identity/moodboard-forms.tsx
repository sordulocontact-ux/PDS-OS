"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  createArtistMoodboard,
  importFigmaMoodboards,
  updateArtistMoodboard,
} from "@/lib/catalog/moodboard-actions";
import {
  MAX_MOODBOARD_NOTE,
  MAX_MOODBOARD_TITLE,
} from "@/lib/catalog/moodboard-rules";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";

const fr = { artistIdentity };

/**
 * « Nouveau moodboard » (no `initial`) or « Modifier » of a folder: its name
 * and intention. A new folder opens once created (`onCreated`).
 */
export function MoodboardForm({
  artistId,
  initial,
  onDone,
  onCreated,
}: {
  artistId: string;
  initial?: { id: string; title: string; note: string | null };
  onDone: () => void;
  onCreated?: (id: string) => void;
}) {
  const t = fr.artistIdentity.moodboards.form;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleError = tried && !title.trim() ? t.titleMissing : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!title.trim())
          return document.getElementById("moodboard-title")?.focus();
        start(async () => {
          if (initial) {
            const result = await updateArtistMoodboard({
              artistId,
              moodboardId: initial.id,
              title,
              note,
            });
            if (!result.ok) return setError(result.error);
            toast.success(t.saved);
            onDone();
            return router.refresh();
          }
          const result = await createArtistMoodboard({ artistId, title, note });
          if (!result.ok) return setError(result.error);
          toast.success(t.created);
          onDone();
          onCreated?.(result.id);
          router.refresh();
        });
      }}
    >
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field
        id="moodboard-title"
        name="title"
        label={t.title}
        placeholder={t.titlePlaceholder}
        aria-required
        maxLength={MAX_MOODBOARD_TITLE}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={titleError}
        autoFocus
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="moodboard-note">{t.note}</Label>
        <Textarea
          id="moodboard-note"
          name="note"
          rows={3}
          maxLength={MAX_MOODBOARD_NOTE}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-describedby="moodboard-note-hint"
        />
        <p id="moodboard-note-hint" className="text-xs text-muted-foreground">
          {t.noteHint}
        </p>
      </div>
      <DialogFormActions
        pending={pending}
        submitLabel={initial ? t.submitEdit : t.submitCreate}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * « Importer depuis Figma »: a frame's link becomes a folder with its
 * images; a page's link, one folder per frame (lib/integrations/figma.ts).
 */
export function FigmaImportForm({
  artistId,
  onDone,
}: {
  artistId: string;
  onDone: () => void;
}) {
  const t = fr.artistIdentity.moodboards.figma;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!link.trim()) {
          setError(t.errors.link);
          return document.getElementById("figma-link")?.focus();
        }
        setError(null);
        start(async () => {
          const result = await importFigmaMoodboards({ artistId, link });
          if (!result.ok) return setError(result.error);
          toast.success(t.done(result.boards, result.images), {
            description:
              result.failed > 0 ? t.partial(result.failed) : undefined,
          });
          onDone();
          router.refresh();
        });
      }}
    >
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field
        id="figma-link"
        name="link"
        type="url"
        inputMode="url"
        label={t.link}
        placeholder={t.linkPlaceholder}
        hint={t.linkHint}
        aria-required
        value={link}
        onChange={(event) => setLink(event.target.value)}
        autoFocus
      />
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        pendingLabel={t.pending}
        onCancel={onDone}
      />
    </form>
  );
}

"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { CaptureCard } from "@/components/labo/captures/capture-card";
import {
  CAPTURE_TYPES,
  useCaptureQueue,
} from "@/components/labo/captures/use-capture-queue";
import { EmptyNote } from "@/components/shell/empty-state";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { fr } from "@/lib/i18n/fr";

/**
 * Labo: TikTok screenshots dropped, picked or pasted (⌘V anywhere on the
 * page), each read by the server; the newest first.
 */
export function CaptureArtistsBench() {
  const t = fr.laboCaptures;
  const { items, add, remove, retry } = useCaptureQueue();

  const addFiles = (files: File[]) => {
    const skipped = add(files);
    if (skipped > 0) toast(t.skipped(skipped));
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      const skipped = add(files);
      if (skipped > 0) toast(t.skipped(skipped));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add, t]);

  return (
    <div className="grid gap-4">
      <FileDropZone
        label={t.drop}
        hint={t.dropHint}
        accept={CAPTURE_TYPES.join(",")}
        multiple
        onFiles={addFiles}
      />
      {items.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <div className="grid gap-3">
          {[...items].reverse().map((item) => (
            <CaptureCard
              key={item.id}
              item={item}
              onRemove={() => remove(item.id)}
              onRetry={() => retry(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

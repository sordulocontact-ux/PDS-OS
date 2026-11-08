"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";

import { CaptureCard } from "@/components/labo/captures/capture-card";
import { CaptureLinkForm } from "@/components/labo/captures/capture-link-form";
import { ClipboardPasteButton } from "@/components/labo/captures/clipboard-paste-button";
import {
  CAPTURE_TYPES,
  useCaptureQueue,
} from "@/components/labo/captures/use-capture-queue";
import { EmptyNote } from "@/components/shell/empty-state";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";

const fr = { laboCaptures };

// A TikTok or Instagram address in a text pasted outside a field.
const SOCIAL_LINK = /https?:\/\/[^\s]*(tiktok|instagram)\.com/i;

/**
 * Repérage: TikTok screenshots dropped, picked or pasted (⌘V anywhere on
 * the page), and TikTok or Instagram links, each read by the server; the
 * newest first. `sharedLink` (?url=…) and `paste` (?coller=1) come from the
 * iPhone Raccourci or a share. `canAddToNetwork` (manage_network): each
 * person read can be saved to the Réseau.
 */
export function CaptureArtistsBench({
  canAddToNetwork,
  sharedLink,
  paste,
}: {
  canAddToNetwork: boolean;
  sharedLink: string | null;
  paste: boolean;
}) {
  const t = fr.laboCaptures;
  const { items, add, addLink, remove, retry } = useCaptureQueue();
  const results = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

  // A new capture or link is read at the top of the list: brought into view
  // when it is below the screen (a phone, arrived by the Raccourci), so the
  // reading shows without scrolling.
  useEffect(() => {
    const added = items.length > seen.current;
    seen.current = items.length;
    const list = results.current;
    if (!added || !list) return;
    if (list.getBoundingClientRect().top < window.innerHeight * 0.6) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollIntoView({
      behavior: still ? "auto" : "smooth",
      block: "start",
    });
  }, [items.length]);

  // A shared link is read once; the address loses its parameters so that a
  // reload does not read it again (the page itself is not reloaded).
  useEffect(() => {
    if (sharedLink) addLink(sharedLink);
    if (sharedLink || paste)
      window.history.replaceState(null, "", window.location.pathname);
  }, [sharedLink, paste, addLink]);

  const addFiles = (files: File[]) => {
    const skipped = add(files);
    if (skipped > 0) toast(t.skipped(skipped));
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) {
        // A link pasted outside a field (in the link field, it is typed).
        const target = event.target as HTMLElement | null;
        const text = event.clipboardData?.getData("text") ?? "";
        if (target?.closest("input, textarea, [contenteditable]")) return;
        if (!SOCIAL_LINK.test(text)) return;
        event.preventDefault();
        addLink(text);
        return;
      }
      event.preventDefault();
      const skipped = add(files);
      if (skipped > 0) toast(t.skipped(skipped));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add, addLink, t]);

  return (
    <div className="grid gap-4">
      {paste && (
        <ClipboardPasteButton ready onFiles={addFiles} onLink={addLink} />
      )}
      <FileDropZone
        label={t.drop}
        hint={
          <>
            <span className="hidden pointer-fine:inline">{t.pasteHint} </span>
            {t.dropHint}
          </>
        }
        accept={CAPTURE_TYPES.join(",")}
        multiple
        onFiles={addFiles}
      />
      <CaptureLinkForm onLink={addLink} />
      {!paste && (
        // A phone has no ⌘ V: the button stands for it.
        <div className="pointer-fine:hidden">
          <ClipboardPasteButton
            ready={false}
            onFiles={addFiles}
            onLink={addLink}
          />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <div ref={results} className="grid scroll-mt-4 gap-3">
          {[...items].reverse().map((item) => (
            <CaptureCard
              key={item.id}
              item={item}
              canAddToNetwork={canAddToNetwork}
              onRemove={() => remove(item.id)}
              onRetry={() => retry(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

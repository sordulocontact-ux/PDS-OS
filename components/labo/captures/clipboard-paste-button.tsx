"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";

const fr = { laboCaptures };

const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Reads the clipboard on a tap: an image becomes a screenshot to read, a
 * text with a link becomes a link. A phone has no ⌘ V, and a page may read
 * the clipboard only on a gesture (Safari then shows its « Coller »
 * bubble): the iPhone Raccourci copies the screenshot and opens the page
 * with `?coller=1`, which makes this button the first thing to tap.
 */
export function ClipboardPasteButton({
  ready,
  onFiles,
  onLink,
}: {
  ready: boolean;
  onFiles: (files: File[]) => void;
  onLink: (text: string) => void;
}) {
  const t = fr.laboCaptures.paste;
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ready) return;
    button.current?.focus();
    button.current?.scrollIntoView({ block: "center" });
  }, [ready]);

  async function paste() {
    // Called first, still inside the tap: Safari refuses it afterwards.
    let items: ClipboardItems;
    try {
      items = await navigator.clipboard.read();
    } catch {
      toast(t.denied);
      return;
    }
    for (const item of items) {
      const type = item.types.find((kind) => kind in IMAGE_EXT);
      if (!type) continue;
      const blob = await item.getType(type);
      onFiles([
        new File([blob], `capture.${IMAGE_EXT[type]}`, {
          type,
          lastModified: Date.now(),
        }),
      ]);
      return;
    }
    for (const item of items) {
      if (!item.types.includes("text/plain")) continue;
      const text = await (await item.getType("text/plain")).text();
      if (/https?:\/\//i.test(text)) {
        onLink(text);
        return;
      }
    }
    toast(t.empty);
  }

  return (
    <div className="grid justify-items-start gap-2">
      {ready && <p className="text-sm">{t.ready}</p>}
      <Button
        ref={button}
        type="button"
        variant={ready ? "default" : "outline"}
        onClick={() => void paste()}
      >
        {t.button}
      </Button>
    </div>
  );
}

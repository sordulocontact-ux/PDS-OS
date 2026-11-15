"use client";

import { IconLoader, IconPaperclip, IconXmark } from "nucleo-sharp-essential";
import { useRef } from "react";

import type { AttachedImage } from "@/components/assistant/use-image-attachments";
import { Button } from "@/components/ui/button";
import { ASSISTANT_IMAGE_ACCEPT } from "@/lib/assistant/image-rules";
import { assistant } from "@/lib/i18n/fr/assistant";
import { cn } from "@/lib/utils";

const fr = { assistant };

/**
 * The images joined to the question, above the text in PO's box: a square
 * each, the wheel while it is sent, a hairline of warning when it failed,
 * and « Retirer » on every one (an image is taken back before sending).
 */
export function ComposerImages({
  images,
  onRemove,
}: {
  images: AttachedImage[];
  onRemove: (id: string) => void;
}) {
  const t = fr.assistant.images;
  if (images.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t.list}>
      {images.map((image, index) => (
        <li
          key={image.id}
          className={cn(
            "relative size-16 overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-background",
            image.status === "failed" &&
              "border-[color:var(--tone-warning-fg)]",
          )}
        >
          {/* An object URL of the file itself: next/image cannot read it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.preview}
            alt={t.image(index + 1)}
            className={cn(
              "size-full object-cover",
              image.status !== "ready" && "opacity-50",
            )}
          />
          {image.status === "uploading" && (
            <span className="absolute inset-0 grid place-items-center">
              <IconLoader
                aria-label={t.uploading}
                className="size-5 animate-spin motion-reduce:animate-none"
              />
            </span>
          )}
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            onClick={() => onRemove(image.id)}
            aria-label={t.remove(index + 1)}
            className="absolute top-1 right-1 rounded-full"
          >
            <IconXmark aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** The paperclip of PO's box: picks images, beside the microphone's
 * family (a white square with a hairline). */
export function AttachImageButton({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const t = fr.assistant.images;
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={ASSISTANT_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        aria-label={t.add}
        title={t.add}
        className="shrink-0 border-[color:var(--border-hairline)]"
      >
        <IconPaperclip aria-hidden className="size-5" />
      </Button>
    </>
  );
}

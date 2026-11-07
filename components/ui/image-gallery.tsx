"use client";

import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type GalleryImage = {
  key: string;
  src: string;
  alt: string;
  // Said on the thumbnail (« Voir la capture 2 »).
  openLabel: string;
  // Said as the viewer's title (« Capture 2 sur 4 »).
  title: string;
};

// A row of thumbnails; a click opens the image large in the app's one modal,
// without leaving the page. With several, ← and → (or the arrows) move from
// one to the next; no wrap-around, the counter says where we are. Changing
// image is not animated: it is often done from the keyboard.
export function ImageGallery({
  images,
  labels,
}: {
  images: GalleryImage[];
  labels: { close: string; previous: string; next: string };
}) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : images[open];
  const many = images.length > 1;
  const go = (step: number) =>
    setOpen((index) =>
      index === null
        ? index
        : Math.min(images.length - 1, Math.max(0, index + step)),
    );

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <li key={image.key}>
            <button
              type="button"
              aria-label={image.openLabel}
              onClick={() => setOpen(index)}
              className="block w-fit cursor-zoom-in rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL of a private bucket */}
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                className="max-h-40 max-w-full rounded-lg border border-border object-contain"
              />
            </button>
          </li>
        ))}
      </ul>
      <Dialog
        open={current !== null}
        onOpenChange={(next) => !next && setOpen(null)}
      >
        <DialogContent
          closeLabel={labels.close}
          className="sm:max-w-[var(--dialog-width-viewer)]"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") go(-1);
            else if (event.key === "ArrowRight") go(1);
          }}
        >
          {current && open !== null && (
            <>
              <DialogTitle className="sr-only">{current.title}</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL of a private bucket */}
              <img
                src={current.src}
                alt={current.alt}
                className="mx-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-lg object-contain"
              />
              {many && (
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={open === 0}
                    onClick={() => go(-1)}
                  >
                    <IconChevronLeft aria-hidden />
                    <span className="sr-only">{labels.previous}</span>
                  </Button>
                  <span
                    aria-hidden
                    className="min-w-12 text-center text-sm text-muted-foreground tabular-nums"
                  >
                    {open + 1} / {images.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={open === images.length - 1}
                    onClick={() => go(1)}
                  >
                    <IconChevronRight aria-hidden />
                    <span className="sr-only">{labels.next}</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// A person's picture (an artist's comes from Deezer), or initials on grey when there is
// none or the platform no longer serves it. Decorative: the name always sits
// next to it.
export function Avatar({
  name,
  pictureUrl,
  contain = false,
  className,
}: {
  name: string;
  pictureUrl: string | null;
  // A logo, whole on a light disc (a sender's icon in « Mails »), rather
  // than a photo filling the circle.
  contain?: boolean;
  // Sets the size (e.g. `size-10`); defaults to 32 px.
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  // A logo shows once loaded: the initials stay until then (and for good
  // when the brand has none).
  const [loaded, setLoaded] = useState(false);
  const showPicture = Boolean(pictureUrl) && !broken;

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-circle)] bg-[var(--surface-sunken)] text-[length:var(--type-caption)] font-semibold text-muted-foreground select-none",
        className,
      )}
    >
      {/* Initials underneath: shown while the picture loads, or without one. */}
      {initials(name)}
      {showPicture && (
        // A plain <img>: Deezer's CDN is the only source, no optimisation
        // pipeline (next/image remotePatterns) for a few thumbnails.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl ?? undefined}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          onLoad={() => setLoaded(true)}
          className={cn(
            "absolute inset-0 size-full",
            // A logo on white, as mail apps show it: a black one stays
            // visible in the dark theme.
            contain
              ? "bg-[var(--po-white)] object-contain p-1.5"
              : "object-cover",
            contain && !loaded && "invisible",
          )}
        />
      )}
    </span>
  );
}

// "Nova Kessel" → "NK", "Angèle" → "AN".
function initials(name: string): string {
  // Array.from: code points, so an accented or emoji initial stays whole.
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
  if (words.length === 0) return "";
  const letters =
    words.length > 1
      ? [words[0][0], words[words.length - 1][0]]
      : words[0].slice(0, 2);
  return letters.join("").toUpperCase();
}

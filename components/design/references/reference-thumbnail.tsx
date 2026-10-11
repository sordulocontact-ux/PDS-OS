"use client";

import { useState } from "react";

/**
 * A reference's thumbnail; what it is (`fallback`) when the picture cannot
 * be loaded: a link's picture lives on another site, which may refuse it.
 */
export function ReferenceThumbnail({
  src,
  fallback,
}: {
  src: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL of a private bucket, or another site's picture
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

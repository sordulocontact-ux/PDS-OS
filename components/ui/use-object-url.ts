"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * A local URL for a file or blob (preview before upload), revoked when the
 * blob changes or the component goes. The revocation waits a microtask: in
 * development, React's strict mode unmounts and remounts at once, and a URL
 * revoked there would leave a broken image.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  const live = useRef<string | null>(null);
  useEffect(() => {
    live.current = url;
    return () => {
      live.current = null;
      queueMicrotask(() => {
        if (url && live.current !== url) URL.revokeObjectURL(url);
      });
    };
  }, [url]);
  return url;
}

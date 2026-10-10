"use client";

import { useEffect, useState } from "react";

import type { ImageReading } from "@/lib/strategy/documents/direction";

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

function load(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * What the selected images look like, read in the browser from a 32 × 32
 * copy of each: their most frequent colours, mean lightness and saturation
 * (lib/strategy/documents/direction.ts turns that into a proposal). Plain
 * arithmetic on pixels; an image the browser may not read (no CORS) is
 * skipped. Null while reading.
 */
export function useImageReading(urls: string[]): ImageReading | null {
  const key = urls.join("|");
  const [reading, setReading] = useState<ImageReading | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const buckets = new Map<
        string,
        { n: number; r: number; g: number; b: number }
      >();
      let light = 0;
      let sat = 0;
      let count = 0;
      for (const url of key ? key.split("|").slice(0, 6) : []) {
        const img = await load(url);
        if (!img || !ctx) continue;
        try {
          ctx.drawImage(img, 0, 0, 32, 32);
          const data = ctx.getImageData(0, 0, 32, 32).data;
          for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            const max = Math.max(r, g, b) / 255;
            const min = Math.min(r, g, b) / 255;
            light += (max + min) / 2;
            sat += max === 0 ? 0 : (max - min) / max;
            count += 1;
            // Coarse buckets (8 levels per channel) for the palette.
            const k = `${r >> 5}-${g >> 5}-${b >> 5}`;
            const bucket = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
            bucket.n += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
            buckets.set(k, bucket);
          }
        } catch {
          // A tainted canvas (an image from a host without CORS): skipped.
        }
      }
      if (cancelled) return;
      setReading({
        palette: [...buckets.values()]
          .sort((a, b) => b.n - a.n)
          .slice(0, 5)
          .map((c) =>
            hex(
              Math.round(c.r / c.n),
              Math.round(c.g / c.n),
              Math.round(c.b / c.n),
            ),
          ),
        lightness: count ? light / count : null,
        saturation: count ? sat / count : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return reading;
}

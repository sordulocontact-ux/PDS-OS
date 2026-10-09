"use client";

import { useEffect, useState } from "react";

import { THEMES, type Theme } from "@/lib/strategy/documents/model";

export type ImageReading = {
  // Themes in the order they suit the images, best first.
  themes: Theme[];
  accent: string | null;
  palette: string[];
};

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
 * Reads the selected images in the browser (a 32 × 32 copy of each): their
 * mean lightness and saturation rank the three directions, their most
 * frequent colours make the palette, the most saturated one the accent.
 * Plain arithmetic on pixels; an image the browser may not read (no CORS)
 * is skipped, and with none the directions keep their default order.
 */
export function useImagePalette(urls: string[]): ImageReading | null {
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
            // Coarse buckets (32 levels per channel) for the palette.
            const k = `${r >> 5}-${g >> 5}-${b >> 5}`;
            const bucket = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
            bucket.n += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
            buckets.set(k, bucket);
          }
        } catch {
          // A tainted canvas (image from a host without CORS): skipped.
        }
      }
      if (cancelled) return;
      if (count === 0) {
        setReading({
          themes: ["paper", "night", "color"],
          accent: null,
          palette: [],
        });
        return;
      }
      const meanLight = light / count;
      const meanSat = sat / count;
      const palette = [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 5)
        .map((c) =>
          hex(
            Math.round(c.r / c.n),
            Math.round(c.g / c.n),
            Math.round(c.b / c.n),
          ),
        );
      const saturation = (h: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        const max = Math.max(r, g, b);
        return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
      };
      const accent =
        [...palette].sort((a, b) => saturation(b) - saturation(a))[0] ?? null;
      const first: Theme =
        meanLight < 0.38 ? "night" : meanSat > 0.42 ? "color" : "paper";
      setReading({
        themes: [first, ...THEMES.filter((th) => th !== first)],
        accent,
        palette,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return reading;
}

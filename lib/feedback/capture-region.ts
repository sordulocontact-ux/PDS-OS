import { MAX_SCREENSHOT_BYTES } from "@/lib/feedback/screenshot-rules";
import { canvasToBlob } from "@/lib/images/shrink-image";

// Browser-side: a picture of a zone of the page, as the user sees it. A web
// page cannot read the screen without asking for it each time, so the page
// is redrawn from its own DOM (modern-screenshot, loaded on first capture):
// the whole body is drawn, then cropped to the zone.

export type Region = { x: number; y: number; width: number; height: number };

/** Elements marked with it (the capture overlay) are left out. */
export const CAPTURE_IGNORE = "data-capture-ignore";
const PIN = "data-capture-pin";

// An empty image (transparent 1×1 GIF) standing in for those outside the zone.
const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
// Longest wait for an image or a download; past it, the image stays blank.
const WAIT_MS = 5000;

const meets = (rect: DOMRect, region: Region) =>
  rect.right > region.x &&
  rect.left < region.x + region.width &&
  rect.bottom > region.y &&
  rect.top < region.y + region.height;

type Swapped = {
  img: HTMLImageElement;
  src: string | null;
  srcset: string | null;
  sizes: string | null;
};

// Only the images in the zone matter. The library waits for every image of
// the page and downloads each again: a lazy image below the fold never loads
// by itself, and the capture hung on it. An image not loaded yet shows
// nothing on screen: it is blanked for the time of the copy, wherever it is.
// A loaded one out of the zone is not downloaded again (`blankUrls`, read by
// fetchFn).
function sortImages(region: Region) {
  const swapped: Swapped[] = [];
  const kept = new Set<string>();
  const outside = new Set<string>();
  for (const img of document.images) {
    if (!img.complete) {
      swapped.push({
        img,
        src: img.getAttribute("src"),
        srcset: img.getAttribute("srcset"),
        sizes: img.getAttribute("sizes"),
      });
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = BLANK;
      continue;
    }
    const urls = [img.src, img.currentSrc];
    const set = meets(img.getBoundingClientRect(), region) ? kept : outside;
    for (const url of urls) set.add(url);
  }
  const blankUrls = new Set([...outside].filter((url) => !kept.has(url)));
  const restore = () => {
    for (const { img, src, srcset, sizes } of swapped) {
      if (sizes !== null) img.setAttribute("sizes", sizes);
      if (srcset !== null) img.setAttribute("srcset", srcset);
      if (src !== null) img.setAttribute("src", src);
      else img.removeAttribute("src");
    }
  };
  return { blankUrls, restore };
}

// The copy of the page is drawn unscrolled: a sticky or fixed element would
// land where it sits at the top of the page, not where it is seen. Each one
// is pinned where it stands, through an attribute the copy carries.
function pinStuckElements(): HTMLElement[] {
  const pinned: HTMLElement[] = [];
  for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
    const { position } = getComputedStyle(el);
    if (position !== "sticky" && position !== "fixed") continue;
    const seen = el.getBoundingClientRect();
    if (seen.width === 0 && seen.height === 0) continue;
    if (position === "sticky") {
      // Its place if it did not stick, measured before the next paint.
      const inline = el.style.position;
      el.style.position = "static";
      const natural = el.getBoundingClientRect();
      el.style.position = inline;
      el.setAttribute(
        PIN,
        `sticky ${seen.left - natural.left} ${seen.top - natural.top}`,
      );
    } else {
      el.setAttribute(
        PIN,
        `fixed ${seen.left + window.scrollX} ${seen.top + window.scrollY} ${seen.width} ${seen.height}`,
      );
    }
    pinned.push(el);
  }
  return pinned;
}

function applyPin(node: Node) {
  if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return;
  const pin = node.getAttribute(PIN);
  if (!pin) return;
  node.removeAttribute(PIN);
  const [kind, ...numbers] = pin.split(" ");
  const [a, b, width, height] = numbers.map(Number);
  const style = node.style;
  if (kind === "sticky") {
    style.setProperty("position", "relative", "important");
    style.setProperty("left", `${a}px`, "important");
    style.setProperty("top", `${b}px`, "important");
    style.setProperty("right", "auto", "important");
    style.setProperty("bottom", "auto", "important");
  } else {
    style.setProperty("left", `${a}px`, "important");
    style.setProperty("top", `${b}px`, "important");
    style.setProperty("right", "auto", "important");
    style.setProperty("bottom", "auto", "important");
    style.setProperty("width", `${width}px`, "important");
    style.setProperty("height", `${height}px`, "important");
    style.setProperty("margin", "0", "important");
    style.setProperty("translate", "none", "important");
    style.setProperty("transform", "none", "important");
  }
}

const keep = (node: Node) =>
  !(node instanceof Element) ||
  (!node.hasAttribute(CAPTURE_IGNORE) && node.localName !== "nextjs-portal");

/** A zone of the viewport (CSS pixels), as a PNG (JPEG if too heavy). */
export async function captureRegion(region: Region): Promise<File> {
  const { domToCanvas } = await import("modern-screenshot");
  const body = document.body;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const pinned = pinStuckElements();
  const { blankUrls, restore } = sortImages(region);
  let page: HTMLCanvasElement;
  try {
    page = await domToCanvas(body, {
      scale,
      backgroundColor: getComputedStyle(body).backgroundColor,
      filter: keep,
      onCloneEachNode: applyPin,
      timeout: WAIT_MS,
      fetchFn: async (url) => (blankUrls.has(url) ? BLANK : false),
      fetch: { placeholderImage: BLANK },
    });
  } finally {
    restore();
    for (const el of pinned) el.removeAttribute(PIN);
  }

  // The body's own box is the origin of the drawing; a very long page may
  // have been drawn smaller than asked, hence the ratio read back.
  const origin = body.getBoundingClientRect();
  const ratio = page.width / origin.width;
  const crop = document.createElement("canvas");
  crop.width = Math.round(region.width * ratio);
  crop.height = Math.round(region.height * ratio);
  const context = crop.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.drawImage(
    page,
    Math.round((region.x - origin.left) * ratio),
    Math.round((region.y - origin.top) * ratio),
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  let blob = await canvasToBlob(crop, "image/png");
  if (blob && blob.size > MAX_SCREENSHOT_BYTES)
    blob = await canvasToBlob(crop, "image/jpeg", 0.9);
  if (!blob) throw new Error("capture_failed");
  const ext = blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], `capture.${ext}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

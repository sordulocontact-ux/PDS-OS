"use client";

import { IconMsgSmile } from "nucleo-sharp-essential";
import { useEffect, useRef, useState } from "react";

import {
  CAPTURE_IGNORE,
  captureRegion,
  type Region,
} from "@/lib/feedback/capture-region";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

// Below this, a press and release is a click, not a drag.
const DRAG_THRESHOLD = 4;
// A smaller zone is a slip, not a capture.
const MIN_SIZE = 8;
// Past this, the capture is given up: the window opens without it.
const CAPTURE_LIMIT_MS = 20_000;

function withinLimit<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("capture_timeout")), CAPTURE_LIMIT_MS),
    ),
  ]);
}

const regionOf = (a: Point, b: Point): Region => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

/**
 * Capture of a zone of the page for a feedback, like Figma's comments: the
 * cursor carries the feedback icon; click a corner then the opposite one (or
 * drag from one to the other), and the zone freezes and is captured. Escape
 * cancels, even during the capture. The page stays still meanwhile: no
 * scroll, no click reaches it.
 */
export function ZoneCapture({
  onCaptured,
  onFailed,
  onCancel,
}: {
  onCaptured: (file: File) => void;
  onFailed: () => void;
  onCancel: () => void;
}) {
  const t = fr.feedback.capture;
  const root = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);
  // The second corner: once set, the zone no longer follows the pointer.
  const [end, setEnd] = useState<Point | null>(null);
  const capturing = end !== null;
  const pressedAt = useRef<Point | null>(null);
  // Cancelled (Escape) while capturing: the result is dropped.
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    // The zone is read in the viewport: the page must not scroll under it.
    const onWheel = (event: WheelEvent) => event.preventDefault();
    const node = root.current;
    window.addEventListener("keydown", onKey, true);
    node?.addEventListener("wheel", onWheel, { passive: false });
    node?.focus();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      node?.removeEventListener("wheel", onWheel);
    };
  }, [onCancel]);

  const finish = (a: Point, b: Point) => {
    const region = regionOf(a, b);
    if (region.width < MIN_SIZE || region.height < MIN_SIZE) {
      setAnchor(null);
      return;
    }
    setEnd(b);
    withinLimit(captureRegion(region)).then(
      (file) => !gone.current && onCaptured(file),
      (error: unknown) => {
        console.error("[feedback] zone capture failed:", error);
        if (!gone.current) onFailed();
      },
    );
  };

  const at = (event: React.PointerEvent): Point => ({
    x: event.clientX,
    y: event.clientY,
  });

  const onPointerDown = (event: React.PointerEvent) => {
    if (capturing || event.button !== 0) return;
    event.preventDefault();
    const point = at(event);
    pressedAt.current = point;
    // First corner; the second one comes with the next click or the release.
    if (!anchor) setAnchor(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const pressed = pressedAt.current;
    pressedAt.current = null;
    if (capturing || !pressed || !anchor) return;
    const point = at(event);
    const moved = Math.hypot(point.x - pressed.x, point.y - pressed.y);
    const firstClick = pressed.x === anchor.x && pressed.y === anchor.y;
    // A click on the first corner: wait for the second one.
    if (firstClick && moved < DRAG_THRESHOLD) return;
    finish(anchor, point);
  };

  const corner = end ?? pointer;
  const zone = anchor && corner ? regionOf(anchor, corner) : null;

  return (
    <div
      ref={root}
      {...{ [CAPTURE_IGNORE]: "" }}
      role="application"
      aria-label={t.label}
      tabIndex={-1}
      onPointerMove={(event) => !capturing && setPointer(at(event))}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => !anchor && setPointer(null)}
      onContextMenu={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={cn(
        "fixed inset-0 z-50 touch-none outline-none select-none",
        capturing ? "cursor-progress" : "cursor-crosshair",
      )}
    >
      {zone && (
        <div
          aria-hidden
          className="absolute rounded-[var(--radius-xs)] border-2 border-[color:var(--border-strong)] shadow-[0_0_0_100vmax_var(--overlay-scrim)]"
          style={{
            left: zone.x,
            top: zone.y,
            width: zone.width,
            height: zone.height,
          }}
        />
      )}

      {pointer && !capturing && (
        <span
          aria-hidden
          className="surface-glass pointer-events-none absolute top-0 left-0 flex size-8 items-center justify-center rounded-full rounded-tl-none bg-[var(--surface-glass)] text-foreground shadow-elevation-2 backdrop-blur-[var(--glass-panel-blur)]"
          style={{ translate: `${pointer.x + 6}px ${pointer.y + 6}px` }}
        >
          <IconMsgSmile className="size-4" />
        </span>
      )}

      <p
        role="status"
        className="surface-glass pointer-events-none fixed top-4 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-[var(--surface-glass)] px-4 py-2 text-center text-sm font-medium text-foreground shadow-elevation-2 backdrop-blur-[var(--glass-panel-blur)]"
      >
        {capturing ? t.working : anchor ? t.secondCorner : t.firstCorner}
        <span className="text-muted-foreground"> · {t.cancelHint}</span>
      </p>
    </div>
  );
}

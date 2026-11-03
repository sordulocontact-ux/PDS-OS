"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IconCircleInfo,
  IconTriangleWarning,
  IconXmark,
} from "nucleo-sharp-essential";

import { IconCircleCheck, IconCircleXmark } from "@/components/icons";
import { dismissToast, type ToastItem, type ToastTone } from "@/components/ui/toast";
import { core } from "@/lib/i18n/fr/core";

const fr = { core };
// A swipe to the right closes past this distance, or past this speed (px/ms).
const SWIPE_DISTANCE = 64;
const SWIPE_SPEED = 0.45;

export type ToastPlace = {
  /** 0 = in front. */
  index: number;
  z: number;
  y: number;
  scale: number;
  /** Pixels cut from the top, so a taller toast behind peeks like the front one. */
  cut: number;
  /** Behind the front one, stack closed: its content is hidden. */
  folded: boolean;
};

const ICONS: Record<Exclude<ToastTone, "default">, typeof IconCircleInfo> = {
  success: IconCircleCheck,
  error: IconCircleXmark,
  warning: IconTriangleWarning,
  info: IconCircleInfo,
};

/** One toast: its timer, its swipe, its close button and its gesture. */
export function ToastCard({
  item,
  place,
  paused,
  onMeasure,
}: {
  item: ToastItem;
  place: ToastPlace;
  paused: boolean;
  onMeasure: (id: string, height: number | null) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [entered, setEntered] = useState(false);
  const [swipe, setSwipe] = useState<number | null>(null);
  const drag = useRef<{ x: number; at: number } | null>(null);
  const left = useRef({ version: -1, ms: 0 });
  const { id, tone, version, duration, exit } = item;
  const front = place.index === 0;

  // Its height places the others; it changes with the text.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() => onMeasure(id, node.offsetHeight));
    observer.observe(node);
    return () => {
      observer.disconnect();
      onMeasure(id, null);
    };
  }, [id, onMeasure]);

  // Enters from below on the next frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Counts down while nobody reads the stack; shown again = starts over.
  useEffect(() => {
    if (left.current.version !== version)
      left.current = { version, ms: duration };
    if (paused || exit || !Number.isFinite(duration)) return;
    const started = Date.now();
    const timer = setTimeout(
      () => dismissToast(id, front ? "fall" : "fade"),
      left.current.ms,
    );
    return () => {
      clearTimeout(timer);
      left.current.ms -= Date.now() - started;
    };
  }, [id, version, duration, paused, exit, front]);

  const close = () => dismissToast(id, front ? "fall" : "fade");
  const Icon = tone === "default" ? null : ICONS[tone];

  return (
    <li
      ref={ref}
      className="toast"
      role={tone === "error" ? "alert" : "status"}
      data-folded={place.folded || undefined}
      data-exit={exit ?? undefined}
      style={
        {
          "--toast-y": `${place.y}px`,
          "--toast-scale": place.scale,
          "--toast-cut": `${place.cut}px`,
          zIndex: place.z,
        } as React.CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div
        className="toast-card"
        data-state={entered ? undefined : "entering"}
        data-dragging={swipe !== null || undefined}
        style={
          swipe === null
            ? undefined
            : ({ "--toast-swipe": `${swipe}px` } as React.CSSProperties)
        }
        onPointerDown={(event) => {
          if (event.button !== 0 || exit) return;
          if ((event.target as HTMLElement).closest("button, a")) return;
          drag.current = { x: event.clientX, at: performance.now() };
          event.currentTarget.setPointerCapture(event.pointerId);
          setSwipe(0);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const dx = event.clientX - drag.current.x;
          // To the left it resists: the toast only leaves to the right.
          setSwipe(dx >= 0 ? dx : dx / (1 + Math.abs(dx) / 24));
        }}
        onPointerUp={() => {
          const start = drag.current;
          drag.current = null;
          const dx = swipe ?? 0;
          setSwipe(null);
          if (!start) return;
          const speed = dx / Math.max(1, performance.now() - start.at);
          if (dx > SWIPE_DISTANCE || speed > SWIPE_SPEED)
            dismissToast(id, "swipe");
        }}
        onPointerCancel={() => {
          drag.current = null;
          setSwipe(null);
        }}
      >
        {Icon && (
          <Icon aria-hidden className="toast-icon" data-tone={tone} />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="break-words">{item.title}</div>
          {item.description && (
            <div className="toast-description">{item.description}</div>
          )}
        </div>
        {item.action && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              item.action?.onClick();
              close();
            }}
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          className="toast-close"
          aria-label={fr.core.toast.close}
          onClick={close}
        >
          <IconXmark aria-hidden className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

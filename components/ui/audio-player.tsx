"use client";

import { useEffect, useRef, useState } from "react";

import { IconPause, IconPlay } from "@/components/icons";
import { formatTimecode } from "@/lib/catalog/audio-versions";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const fr = { audioFile: core.audioFile };

const t = fr.audioFile;

// Arrow keys on the bar move by this much (seconds).
const STEP = 5;
// Buffering shorter than this shows nothing (no spinner flash).
const BUSY_AFTER_MS = 400;

const finite = (seconds: number) => (Number.isFinite(seconds) ? seconds : 0);

// One sound at a time on the page: starting one pauses the other.
let playing: HTMLAudioElement | null = null;

/**
 * PDS OS's audio player (proto `master-v2.html`, `.play` and `.wave`): a
 * round play button in ink (selection blue while it plays), a thin bar
 * that fills in blue and moves the sound on click, drag or arrow keys, the
 * time and the length. One sound plays at a time; buffering longer than
 * 400 ms shows the spinner in the button; a link that no longer answers
 * says « Lecture impossible ». `ref` reaches the `<audio>` (a listening
 * note moves the sound to its moment).
 */
export function AudioPlayer({
  src,
  label,
  preload = "metadata",
  duration,
  className,
  ref,
}: {
  src: string;
  // « Écouter la V2 »: the play button's name.
  label: string;
  preload?: "none" | "metadata";
  // Seconds, when the file does not say (a recording made in the browser
  // reports an infinite length).
  duration?: number;
  className?: string;
  ref?: React.Ref<HTMLAudioElement>;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [paused, setPaused] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [reported, setReported] = useState(0);
  const length = reported || duration || 0;

  // The bar follows the sound every frame while it plays (timeupdate only
  // fires four times a second), written straight to the style.
  useEffect(() => {
    if (paused) return;
    let frame = 0;
    const tick = () => {
      const el = audio.current;
      if (el && fill.current && length > 0)
        fill.current.style.transform = `scaleX(${Math.min(1, el.currentTime / length)})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, length]);

  // Buffering: the spinner only past the grace delay.
  useEffect(() => {
    if (!busy) return;
    const el = button.current;
    const timer = setTimeout(
      () => el?.setAttribute("data-busy", ""),
      BUSY_AFTER_MS,
    );
    return () => {
      clearTimeout(timer);
      el?.removeAttribute("data-busy");
    };
  }, [busy]);

  function bind(el: HTMLAudioElement | null) {
    audio.current = el;
    if (typeof ref === "function") return ref(el);
    if (ref) ref.current = el;
  }

  function sync(el: HTMLAudioElement) {
    setTime(el.currentTime);
    if (fill.current && length > 0)
      fill.current.style.transform = `scaleX(${Math.min(1, el.currentTime / length)})`;
  }

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) return el.pause();
    setBusy(true);
    void el.play().catch(() => setBusy(false));
  }

  function seek(seconds: number) {
    const el = audio.current;
    if (!el || !length) return;
    el.currentTime = Math.min(length, Math.max(0, seconds));
    sync(el);
  }

  const known = length > 0;
  return (
    <div
      className={cn("flex h-9 min-w-0 items-center gap-2.5", className)}
    >
      <audio
        ref={bind}
        src={src}
        preload={preload}
        onLoadedMetadata={(e) => setReported(finite(e.currentTarget.duration))}
        onDurationChange={(e) => setReported(finite(e.currentTarget.duration))}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onSeeked={(e) => sync(e.currentTarget)}
        onPlay={(e) => {
          if (playing && playing !== e.currentTarget) playing.pause();
          playing = e.currentTarget;
          setPaused(false);
        }}
        onPause={(e) => {
          setPaused(true);
          setBusy(false);
          sync(e.currentTarget);
        }}
        onEnded={() => setBusy(false)}
        onWaiting={() => setBusy(true)}
        onPlaying={() => setBusy(false)}
        onError={() => {
          setFailed(true);
          setBusy(false);
        }}
      >
        <track kind="captions" />
      </audio>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={paused ? label : t.pause(label)}
        aria-pressed={!paused}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:active:scale-[.94] disabled:opacity-40",
          !paused && "bg-[var(--selection)] text-white",
        )}
      >
        {paused ? (
          <IconPlay aria-hidden className="size-3.5" />
        ) : (
          <IconPause aria-hidden className="size-3.5" />
        )}
      </button>
      {failed ? (
        <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          {t.unavailable}
        </span>
      ) : (
        <>
          <span className="group relative flex h-full min-w-12 flex-1 items-center">
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--border-default)]">
              <span
                ref={fill}
                className="absolute inset-0 origin-left rounded-full bg-[var(--selection)]"
                style={{
                  transform: `scaleX(${known ? Math.min(1, time / length) : 0})`,
                }}
              />
            </span>
            {/* The real control, invisible over the bar: click, drag,
                arrow keys and screen readers. */}
            <input
              type="range"
              min={0}
              max={known ? length : 0}
              step="any"
              value={known ? time : 0}
              disabled={!known}
              aria-label={t.position(label)}
              aria-valuetext={t.at(
                formatTimecode(time),
                formatTimecode(length),
              )}
              onChange={(e) => seek(Number(e.currentTarget.value))}
              onKeyDown={(e) => {
                const delta =
                  e.key === "ArrowRight" || e.key === "ArrowUp"
                    ? STEP
                    : e.key === "ArrowLeft" || e.key === "ArrowDown"
                      ? -STEP
                      : 0;
                if (!delta) return;
                e.preventDefault();
                seek(time + delta);
              }}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -inset-y-1 rounded-md peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
            />
          </span>
          <span className="shrink-0 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)] tabular-nums">
            {formatTimecode(time)}
            {known && ` / ${formatTimecode(length)}`}
          </span>
        </>
      )}
    </div>
  );
}

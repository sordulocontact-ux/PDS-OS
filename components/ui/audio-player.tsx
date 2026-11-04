"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

// The waveform's bars, and under which height a bar is drawn as a dot.
const BARS = 36;
const DOT = 0.22;

/**
 * The waveform's shape for a file: drawn from its path (the signed query
 * changes, the file does not), the same every time. A picture of the
 * sound, not its measure: no peak is computed from the audio.
 */
function barsOf(src: string): number[] {
  const path = src.split("?")[0] ?? src;
  let seed = 2166136261;
  for (let i = 0; i < path.length; i++)
    seed = Math.imul(seed ^ path.charCodeAt(i), 16777619);
  const next = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
  let level = 0.5;
  return Array.from({ length: BARS }, (_, i) => {
    level = Math.min(1, Math.max(0.08, level * 0.55 + next() * 0.6));
    // Quiet at both ends, like a sound that starts and stops.
    const edge = Math.min(1, (i + 1) / 5, (BARS - i) / 5);
    return level * edge;
  });
}

// One sound at a time on the page: starting one pauses the other.
let playing: HTMLAudioElement | null = null;

// The played part of the waveform: the ink layer, cut at the position.
const played = (ratio: number) =>
  `inset(0 ${(1 - Math.min(1, Math.max(0, ratio))) * 100}% 0 0)`;

/**
 * PDS OS's audio player (Sacha's model, 04/11/2026): a round play button
 * in ink, a waveform of bars (dots where it is quiet) that turns ink as it
 * plays and moves the sound on click, drag or arrow keys; between the
 * button and the wave, the length (« 1:29 »), then the position once
 * listening began (« 0:43 »). One sound plays at a time; buffering longer than
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
  const bars = useMemo(() => barsOf(src), [src]);

  // The bar follows the sound every frame while it plays (timeupdate only
  // fires four times a second), written straight to the style.
  useEffect(() => {
    if (paused) return;
    let frame = 0;
    const tick = () => {
      const el = audio.current;
      if (el && fill.current && length > 0)
        fill.current.style.clipPath = played(el.currentTime / length);
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
      fill.current.style.clipPath = played(el.currentTime / length);
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
      className={cn("flex h-10 min-w-0 items-center gap-3", className)}
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
          "grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:active:scale-[.94] disabled:opacity-40",
        )}
      >
        {paused ? (
          <IconPlay aria-hidden className="size-4" />
        ) : (
          <IconPause aria-hidden className="size-4" />
        )}
      </button>
      {failed ? (
        <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          {t.unavailable}
        </span>
      ) : (
        <>
          {/* Next to the button (ElevenLabs, Flows): the length at rest,
              the position once listening began; a fixed width so the
              wave does not move. */}
          <span className="min-w-10 shrink-0 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold tabular-nums">
            {time > 0 || !paused
              ? formatTimecode(time)
              : known
                ? formatTimecode(length)
                : ""}
          </span>
          <span className="group relative flex h-full max-w-48 min-w-12 flex-1 items-center">
            <Wave
              bars={bars}
              className="text-[color:var(--text-tertiary)]"
            />
            <span
              ref={fill}
              aria-hidden
              className="absolute inset-0 flex items-center text-foreground"
              style={{ clipPath: played(known ? time / length : 0) }}
            >
              <Wave bars={bars} />
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
        </>
      )}
    </div>
  );
}

/** The bars, in the current color: a dot where the sound is quiet. */
function Wave({ bars, className }: { bars: number[]; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex h-8 w-full items-center justify-between", className)}
    >
      {bars.map((level, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] shrink-0 rounded-full bg-current",
            level < DOT && "h-[3px]",
          )}
          style={level < DOT ? undefined : { height: `${level * 100}%` }}
        />
      ))}
    </span>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  captureErrorOf,
  micPermission,
  openCapture,
  pickFormat,
  type Capture,
  type CaptureError,
  type RecorderSource,
} from "@/components/calls/recorder-media";
import { watchLevels } from "@/components/calls/recorder-watch";
import { MAX_AUDIO_BYTES } from "@/lib/calls/constants";

/**
 * In-browser recording of a call: the microphone alone, or a browser tab
 * (Meet, Zoom, WhatsApp web…) mixed with the microphone. Opus at 32 kbit/s,
 * about 14 MB per hour. Nothing leaves the browser until the user sends it.
 */

export type RecorderStatus =
  "idle" | "requesting" | "recording" | "paused" | "stopped";
export type RecorderError = CaptureError | "too_large" | "save_unavailable";
/** The recording ended without the user stopping it (PROJ-BUG-01). */
export type RecorderInterruption =
  "permission_revoked" | "device_lost" | "recorder_failed";
export type RecorderFormat = [mime: string, base: string, ext: string];

export type RecorderOptions = {
  /** After the microphone is open, before anything is recorded: false = give up. */
  prepare?: (format: RecorderFormat) => Promise<boolean>;
  /** Each slice of the recording as it arrives, with the recorded time so far. */
  onChunk?: (chunk: Blob, recordedMs: number) => void;
};
/** No sound from the shared tab for this long: the call has probably ended. */
export const TAB_SILENCE_MS = 2 * 60 * 1000;
// Below this level the tab counts as silent (a hung-up Meet tab sends digital zero).
const SILENCE_LEVEL = 0.01;
/** Nothing heard at all (microphone and tab) for this long: say it at once,
 * a muted or wrong microphone records minutes of silence otherwise (UX test
 * of 09/10/2026: 5 silent minutes sent, transcribed as subtitle credits). */
export const MIC_SILENCE_MS = 30 * 1000;
/** Under this share of seconds with sound, a recording is « presque muet ». */
export const QUIET_RATIO = 0.05;
// Sound data must flow within this long after starting, or nothing is recorded.
const CONFIRM_MS = 5000;

export type Recording = {
  blob: Blob;
  mime: string;
  ext: string;
  durationSeconds: number;
  // Seconds in which something was heard (microphone or tab), counted live.
  heardSeconds: number;
};

export function useRecorder(
  onLevel: (level: number) => void,
  /** Called once with each finished recording, from the recorder's stop event. */
  onRecorded?: (recording: Recording) => void,
  options: RecorderOptions = {},
) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [interruption, setInterruption] = useState<RecorderInterruption | null>(
    null,
  );
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [source, setSource] = useState<RecorderSource | null>(null);
  const [tabSilent, setTabSilent] = useState(false);
  const [micSilent, setMicSilent] = useState(false);
  const lastTabSound = useRef(0);
  const lastSound = useRef(0);
  const heard = useRef(0);

  const capture = useRef<Capture | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const size = useRef(0);
  const clock = useRef({ startedAt: 0, accumulated: 0 });
  const stopWatch = useRef<(() => void) | null>(null);
  const confirmed = useRef(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const seconds = () =>
    (clock.current.accumulated +
      (clock.current.startedAt
        ? performance.now() - clock.current.startedAt
        : 0)) /
    1000;

  const release = useCallback(() => {
    stopWatch.current?.();
    stopWatch.current = null;
    if (ticker.current) clearInterval(ticker.current);
    capture.current?.streams.forEach((s) =>
      s.getTracks().forEach((t) => t.stop()),
    );
    void capture.current?.context.close().catch(() => undefined);
    capture.current = null;
  }, []);

  useEffect(() => release, [release]);

  const stop = useCallback(() => {
    const active = recorder.current;
    if (!active || active.state === "inactive") return;
    clock.current.accumulated = seconds() * 1000;
    clock.current.startedAt = 0;
    active.stop();
  }, []);

  /** The microphone went away mid-recording: keep what was recorded, say why. */
  const interrupt = useCallback(
    (reason: RecorderInterruption) => {
      if (!recorder.current || recorder.current.state === "inactive") return;
      setInterruption(reason);
      stop();
    },
    [stop],
  );

  async function start(source: RecorderSource) {
    const format = pickFormat();
    if (!format) return setError("unsupported");
    setError(null);
    setInterruption(null);
    setRecording(null);
    setStatus("requesting");

    let opened: Capture;
    try {
      opened = await openCapture(source);
    } catch (caught) {
      setStatus("idle");
      return setError(await captureErrorOf(caught));
    }
    if (options.prepare && !(await options.prepare(format))) {
      opened.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      void opened.context.close().catch(() => undefined);
      setStatus("idle");
      return setError("save_unavailable");
    }
    capture.current = opened;
    setSource(source);
    setTabSilent(false);
    // Sharing stopped from the browser bar: end the recording cleanly.
    opened.tabAudio?.addEventListener("ended", stop);
    // Microphone unplugged or its permission withdrawn: the mix would go on
    // recording silence under « Enregistrement en cours ». Stop and say it.
    opened.micAudio.addEventListener("ended", () => {
      void micPermission().then((state) =>
        interrupt(state === "denied" ? "permission_revoked" : "device_lost"),
      );
    });

    const media = new MediaRecorder(opened.mix, {
      mimeType: format[0],
      audioBitsPerSecond: 32_000,
    });
    recorder.current = media;
    confirmed.current = false;
    chunks.current = [];
    size.current = 0;
    media.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      // « Enregistrement en cours » only once sound data really flows.
      if (
        media.state !== "inactive" &&
        opened.micAudio.readyState === "live" &&
        opened.context.state === "running"
      ) {
        confirmed.current = true;
        setStatus((was) => (was === "requesting" ? "recording" : was));
      }
      chunks.current.push(event.data);
      size.current += event.data.size;
      options.onChunk?.(event.data, Math.round(seconds() * 1000));
      if (size.current > MAX_AUDIO_BYTES * 0.98) {
        setError("too_large");
        stop();
      }
    };
    media.onstop = () => {
      const finished = {
        blob: new Blob(chunks.current, { type: format[1] }),
        mime: format[1],
        ext: format[2],
        durationSeconds: Math.round(seconds()),
        heardSeconds: heard.current,
      };
      setRecording(finished);
      setStatus("stopped");
      onLevel(0);
      release();
      onRecorded?.(finished);
    };

    media.onerror = () => interrupt("recorder_failed");

    media.start(1000);
    clock.current = { startedAt: performance.now(), accumulated: 0 };
    setElapsed(0);
    ticker.current = setInterval(() => setElapsed(Math.floor(seconds())), 500);

    lastTabSound.current = performance.now();
    lastSound.current = performance.now();
    heard.current = 0;
    setMicSilent(false);
    const watch = watchLevels(opened, {
      state: () => recorder.current?.state ?? "inactive",
      onLevel,
      onSecond: (mixLevel, tabLevel) => {
        const now = performance.now();
        if (mixLevel > SILENCE_LEVEL) {
          lastSound.current = now;
          heard.current += 1;
        }
        const mute = now - lastSound.current > MIC_SILENCE_MS;
        setMicSilent((was) => (was === mute ? was : mute));
        if (tabLevel === null) return;
        if (tabLevel > SILENCE_LEVEL) lastTabSound.current = now;
        const silent = now - lastTabSound.current > TAB_SILENCE_MS;
        setTabSilent((was) => (was === silent ? was : silent));
      },
    });
    stopWatch.current = watch;

    // No sound data within a few seconds: the microphone gives nothing.
    setTimeout(() => {
      if (recorder.current === media && !confirmed.current)
        interrupt("recorder_failed");
    }, CONFIRM_MS);
  }

  function pause() {
    if (recorder.current?.state !== "recording") return;
    recorder.current.pause();
    clock.current.accumulated = seconds() * 1000;
    clock.current.startedAt = 0;
    setStatus("paused");
  }

  function resume() {
    if (recorder.current?.state !== "paused") return;
    recorder.current.resume();
    clock.current.startedAt = performance.now();
    lastTabSound.current = performance.now();
    lastSound.current = performance.now();
    setStatus("recording");
  }

  /** "Keep recording": the silence counter starts over. */
  function dismissSilence() {
    lastTabSound.current = performance.now();
    setTabSilent(false);
  }

  function discard() {
    setRecording(null);
    setElapsed(0);
    setError(null);
    setInterruption(null);
    setTabSilent(false);
    setMicSilent(false);
    setStatus("idle");
  }

  return {
    status,
    error,
    interruption,
    elapsed,
    recording,
    source,
    tabSilent,
    micSilent,
    start,
    pause,
    resume,
    stop,
    discard,
    dismissSilence,
  };
}

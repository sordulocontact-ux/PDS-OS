"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  NoTabAudioError,
  openCapture,
  pickFormat,
  readLevel,
  type Capture,
  type RecorderSource,
} from "@/components/calls/recorder-media";
import { MAX_AUDIO_BYTES } from "@/lib/calls/constants";

/**
 * In-browser recording of a call: the microphone alone, or a browser tab
 * (Meet, Zoom, WhatsApp web…) mixed with the microphone. Opus at 32 kbit/s,
 * about 14 MB per hour. Nothing leaves the browser until the user sends it.
 */

export type RecorderStatus =
  "idle" | "requesting" | "recording" | "paused" | "stopped";
export type RecorderError =
  | "unsupported"
  | "permission_denied"
  | "no_tab_audio"
  | "device_error"
  | "too_large";
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
) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [source, setSource] = useState<RecorderSource | null>(null);
  const [tabSilent, setTabSilent] = useState(false);
  const [micSilent, setMicSilent] = useState(false);
  const lastTabSound = useRef(0);
  const lastSound = useRef(0);
  const heard = useRef(0);
  const silenceTicker = useRef<ReturnType<typeof setInterval> | null>(null);

  const capture = useRef<Capture | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const size = useRef(0);
  const clock = useRef({ startedAt: 0, accumulated: 0 });
  const frame = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const seconds = () =>
    (clock.current.accumulated +
      (clock.current.startedAt
        ? performance.now() - clock.current.startedAt
        : 0)) /
    1000;

  const release = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (ticker.current) clearInterval(ticker.current);
    if (silenceTicker.current) clearInterval(silenceTicker.current);
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

  async function start(source: RecorderSource) {
    const format = pickFormat();
    if (!format) return setError("unsupported");
    setError(null);
    setRecording(null);
    setStatus("requesting");

    let opened: Capture;
    try {
      opened = await openCapture(source);
    } catch (caught) {
      setStatus("idle");
      const name = caught instanceof DOMException ? caught.name : "";
      return setError(
        caught instanceof NoTabAudioError
          ? "no_tab_audio"
          : name === "NotAllowedError" || name === "SecurityError"
            ? "permission_denied"
            : "device_error",
      );
    }
    capture.current = opened;
    setSource(source);
    setTabSilent(false);
    // Sharing stopped from the browser bar: end the recording cleanly.
    opened.tabAudio?.addEventListener("ended", stop);

    const media = new MediaRecorder(opened.mix, {
      mimeType: format[0],
      audioBitsPerSecond: 32_000,
    });
    recorder.current = media;
    chunks.current = [];
    size.current = 0;
    media.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      chunks.current.push(event.data);
      size.current += event.data.size;
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

    media.start(1000);
    clock.current = { startedAt: performance.now(), accumulated: 0 };
    setElapsed(0);
    setStatus("recording");
    ticker.current = setInterval(() => setElapsed(Math.floor(seconds())), 500);

    const samples = new Uint8Array(opened.analyser.fftSize);
    const mixSamples = new Uint8Array(opened.analyser.fftSize);
    const tabSamples = new Uint8Array(opened.tabAnalyser?.fftSize ?? 0);
    lastTabSound.current = performance.now();
    lastSound.current = performance.now();
    heard.current = 0;
    setMicSilent(false);
    // Meter: animation frames, which pause in a hidden tab (nobody sees it then).
    const read = () => {
      const paused = recorder.current?.state === "paused";
      onLevel(paused ? 0 : readLevel(opened.analyser, samples));
      frame.current = requestAnimationFrame(read);
    };
    read();

    // Silence: a timer, because during the call the user is on the Meet tab and
    // this one is hidden. Two checks:
    //   * the whole mix: nothing heard at all for 30 s = a muted microphone,
    //     said at once; each second with sound is counted for the review;
    //   * the tab only, for the end of a call: people talking in the room
    //     after hanging up must not hide the silence.
    const tabAnalyser = opened.tabAnalyser;
    silenceTicker.current = setInterval(() => {
      if (recorder.current?.state !== "recording") return;
      const now = performance.now();
      if (readLevel(opened.analyser, mixSamples) > SILENCE_LEVEL) {
        lastSound.current = now;
        heard.current += 1;
      }
      const mute = now - lastSound.current > MIC_SILENCE_MS;
      setMicSilent((was) => (was === mute ? was : mute));
      if (!tabAnalyser) return;
      if (readLevel(tabAnalyser, tabSamples) > SILENCE_LEVEL)
        lastTabSound.current = now;
      const silent = now - lastTabSound.current > TAB_SILENCE_MS;
      setTabSilent((was) => (was === silent ? was : silent));
    }, 1000);
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
    setTabSilent(false);
    setMicSilent(false);
    setStatus("idle");
  }

  return {
    status,
    error,
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

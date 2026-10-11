"use client";

import { readLevel, type Capture } from "@/components/calls/recorder-media";

/**
 * Input levels while recording: the meter on animation frames (they pause in
 * a hidden tab, nobody sees it then), and one reading per second for the
 * silence checks — a timer, because during the call the user sits on the Meet
 * tab and this one is hidden. Returns the cleanup.
 */
export function watchLevels(
  capture: Capture,
  handlers: {
    state: () => RecordingState;
    onLevel: (level: number) => void;
    // Whole mix, and the shared tab alone (null without a tab).
    onSecond: (mixLevel: number, tabLevel: number | null) => void;
  },
): () => void {
  const samples = new Uint8Array(capture.analyser.fftSize);
  const mixSamples = new Uint8Array(capture.analyser.fftSize);
  const tab = capture.tabAnalyser;
  const tabSamples = new Uint8Array(tab?.fftSize ?? 0);

  let frame = 0;
  const read = () => {
    const paused = handlers.state() === "paused";
    handlers.onLevel(paused ? 0 : readLevel(capture.analyser, samples));
    frame = requestAnimationFrame(read);
  };
  read();

  const ticker = setInterval(() => {
    if (handlers.state() !== "recording") return;
    handlers.onSecond(
      readLevel(capture.analyser, mixSamples),
      tab ? readLevel(tab, tabSamples) : null,
    );
  }, 1000);

  return () => {
    cancelAnimationFrame(frame);
    clearInterval(ticker);
  };
}

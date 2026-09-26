"use client";

/**
 * Browser media plumbing for the call recorder: supported format, capture of
 * the microphone and optionally a tab, mixed into one stream with an analyser
 * for the input level.
 */

export type RecorderSource = "mic" | "tab";

const MIME_CANDIDATES: Array<[mime: string, base: string, ext: string]> = [
  ["audio/webm;codecs=opus", "audio/webm", "webm"],
  ["audio/webm", "audio/webm", "webm"],
  ["audio/mp4", "audio/mp4", "m4a"],
];

export function pickFormat() {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    MIME_CANDIDATES.find(([mime]) => MediaRecorder.isTypeSupported(mime)) ??
    null
  );
}

export function isRecordingSupported(source: RecorderSource): boolean {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !pickFormat()
  )
    return false;
  return source === "mic"
    ? "getUserMedia" in navigator.mediaDevices
    : "getDisplayMedia" in navigator.mediaDevices;
}

export class NoTabAudioError extends Error {}

export type Capture = {
  streams: MediaStream[];
  context: AudioContext;
  mix: MediaStream;
  /** Level of everything recorded (the meter). */
  analyser: AnalyserNode;
  /** Level of the shared tab alone: silence there means the call has probably ended. */
  tabAnalyser: AnalyserNode | null;
  tabAudio: MediaStreamTrack | null;
};

/** Opens the microphone (and the shared tab), mixes them into one stream. */
export async function openCapture(source: RecorderSource): Promise<Capture> {
  const streams: MediaStream[] = [];
  try {
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streams.push(mic);

    let tab: MediaStream | null = null;
    if (source === "tab") {
      // Chrome only shares a tab's sound when video is requested too; the video is dropped.
      tab = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streams.push(tab);
      tab.getVideoTracks().forEach((t) => t.stop());
      if (tab.getAudioTracks().length === 0) throw new NoTabAudioError();
    }

    const context = new AudioContext();
    // Created after a permission prompt, the context often starts suspended:
    // nothing would reach the recorder. Resume it explicitly.
    if (context.state === "suspended") await context.resume();
    const destination = context.createMediaStreamDestination();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    let tabAnalyser: AnalyserNode | null = null;
    for (const stream of [mic, tab]) {
      if (!stream) continue;
      const node = context.createMediaStreamSource(
        new MediaStream(stream.getAudioTracks()),
      );
      node.connect(destination);
      node.connect(analyser);
      if (stream === tab) {
        tabAnalyser = context.createAnalyser();
        tabAnalyser.fftSize = 1024;
        node.connect(tabAnalyser);
      }
    }
    return {
      streams,
      context,
      mix: destination.stream,
      analyser,
      tabAnalyser,
      tabAudio: tab?.getAudioTracks()[0] ?? null,
    };
  } catch (error) {
    streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    throw error;
  }
}

/** RMS level of the current input, 0 to 1. */
export function readLevel(
  analyser: AnalyserNode,
  samples: Uint8Array<ArrayBuffer>,
): number {
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const v of samples) sum += ((v - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

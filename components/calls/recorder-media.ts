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
/** The tab picker failed or was cancelled: never a microphone problem. */
export class TabShareError extends Error {}

/** Why the microphone could not be opened, told apart for the user (PROJ-BUG-01). */
export type CaptureError =
  | "unsupported"
  | "permission_denied"
  | "permission_blocked"
  | "system_blocked"
  | "no_device"
  | "device_busy"
  | "tab_cancelled"
  | "no_tab_audio"
  | "device_error";

/**
 * The microphone permission as the browser holds it, read without prompting
 * (null when the browser does not say: Firefox, Safari before 16).
 */
export async function micPermission(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return null;
  }
}

/** Whether any audio input is plugged in, read without prompting. */
export async function hasAudioInput(): Promise<boolean | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === "audioinput");
  } catch {
    return null;
  }
}

/** Before any prompt: what is already known to block the microphone. */
export async function micDiagnosis(): Promise<CaptureError | null> {
  if (await hasAudioInput().then((has) => has === false)) return "no_device";
  return (await micPermission()) === "denied" ? "permission_blocked" : null;
}

/** Maps a failure of openCapture to what the user can do about it. */
export async function captureErrorOf(caught: unknown): Promise<CaptureError> {
  if (caught instanceof NoTabAudioError) return "no_tab_audio";
  if (caught instanceof TabShareError) return "tab_cancelled";
  const name = caught instanceof DOMException ? caught.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    const state = await micPermission();
    // Allowed in the browser yet refused: the system (macOS, Windows) blocks it.
    if (state === "granted") return "system_blocked";
    return state === "denied" ? "permission_blocked" : "permission_denied";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "no_device";
  if (name === "NotReadableError" || name === "AbortError")
    return "device_busy";
  return "device_error";
}

export type Capture = {
  streams: MediaStream[];
  context: AudioContext;
  mix: MediaStream;
  /** Level of everything recorded (the meter). */
  analyser: AnalyserNode;
  /** Level of the shared tab alone: silence there means the call has probably ended. */
  tabAnalyser: AnalyserNode | null;
  tabAudio: MediaStreamTrack | null;
  micAudio: MediaStreamTrack;
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
      try {
        tab = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch (error) {
        throw new TabShareError(String(error));
      }
      streams.push(tab);
      tab.getVideoTracks().forEach((t) => t.stop());
      if (tab.getAudioTracks().length === 0) throw new NoTabAudioError();
    }

    const context = new AudioContext();
    // Created after a permission prompt, the context often starts suspended:
    // nothing would reach the recorder. Resume it explicitly.
    if (context.state === "suspended") await context.resume();
    // Still not running: nothing would be recorded, never pretend otherwise.
    if (context.state !== "running") {
      void context.close().catch(() => undefined);
      throw new DOMException("audio context not running", "NotReadableError");
    }
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
      micAudio: mic.getAudioTracks()[0]!,
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

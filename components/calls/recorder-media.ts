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
  // Safari (before 18.4) and iOS record in MP4/AAC only.
  ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "m4a"],
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
  if (source === "mic") return "getUserMedia" in navigator.mediaDevices;
  // Only Chromium (Chrome, Edge) shares a tab's sound: Safari and Firefox
  // share the screen without it (retour « Échec de l'enregistrement »,
  // 05/11/2026). userAgentData is Chromium's alone.
  return (
    "getDisplayMedia" in navigator.mediaDevices && "userAgentData" in navigator
  );
}

export class NoTabAudioError extends Error {}
/** The tab picker failed or was cancelled: never a microphone problem.
 * `cancelled`: the person closed the picker; otherwise the browser refused. */
export class TabShareError extends Error {
  constructor(
    message: string,
    readonly cancelled: boolean,
  ) {
    super(message);
  }
}

/** Why the microphone could not be opened, told apart for the user (PROJ-BUG-01). */
export type CaptureError =
  | "unsupported"
  | "permission_denied"
  | "permission_blocked"
  | "system_blocked"
  | "no_device"
  | "device_busy"
  | "tab_cancelled"
  | "tab_failed"
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

/**
 * Whether any audio input is plugged in, read without prompting. Safari (and
 * Firefox in some settings) list nothing until the microphone is allowed: an
 * empty list says nothing, never « no microphone » (null).
 */
export async function hasAudioInput(): Promise<boolean | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (devices.length === 0) return null;
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
  if (caught instanceof TabShareError)
    return caught.cancelled ? "tab_cancelled" : "tab_failed";
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
  // Created before the first await, still inside the click: Safari (and
  // Firefox) only let a context start from a user gesture, which the
  // permission prompt below would otherwise consume.
  const context = new AudioContext();
  void context.resume().catch(() => undefined);
  try {
    // The tab first, still inside the click: a browser opens its picker only
    // from a user gesture, which the microphone's permission prompt would
    // otherwise use up (the share then failed as if it had been cancelled,
    // retour « Échec de l'enregistrement », 05/11/2026).
    let tab: MediaStream | null = null;
    if (source === "tab") {
      // Chrome only shares a tab's sound when video is requested too; the video is dropped.
      try {
        tab = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        throw new TabShareError(String(error), name === "NotAllowedError");
      }
      streams.push(tab);
      tab.getVideoTracks().forEach((t) => t.stop());
      if (tab.getAudioTracks().length === 0) throw new NoTabAudioError();
    }

    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streams.push(mic);

    // Often suspended after a permission prompt: nothing would reach the
    // recorder. Resume it explicitly.
    if (context.state === "suspended") await context.resume();
    // Still not running: nothing would be recorded, never pretend otherwise.
    if (context.state !== "running") {
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
    void context.close().catch(() => undefined);
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

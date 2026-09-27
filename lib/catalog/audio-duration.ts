// Past this size, decoding the whole file to read its duration costs too
// much memory (a 50 MB WAV decodes to several hundred MB).
const DECODE_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Browser-side: the duration of an audio file, in whole seconds. Read from
 * its metadata by an <audio> element first (cheap), else by decoding it with
 * Web Audio — the element waits while the tab is hidden. Null when neither
 * can read the format (AIFF in Chrome, for instance): the duration then
 * stays as the person typed it, never guessed.
 */
export async function readAudioDuration(file: File): Promise<number | null> {
  return (await fromMetadata(file)) ?? (await fromDecoding(file));
}

// Streams report Infinity; the database takes 1 s to 23:59:59.
function seconds(duration: number): number | null {
  const value = Math.round(duration);
  return Number.isFinite(value) && value >= 1 && value < 86400 ? value : null;
}

function fromMetadata(file: File, timeoutMs = 4000): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const finish = (value: number | null) => {
      clearTimeout(timer);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);

    audio.onloadedmetadata = () => finish(seconds(audio.duration));
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

async function fromDecoding(file: File): Promise<number | null> {
  if (
    file.size > DECODE_MAX_BYTES ||
    typeof OfflineAudioContext === "undefined"
  )
    return null;
  try {
    const context = new OfflineAudioContext(1, 1, 44100);
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return seconds(buffer.duration);
  } catch {
    return null;
  }
}

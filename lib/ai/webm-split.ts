/**
 * Cuts a WebM recording into smaller WebM files, at cluster boundaries, so a
 * long call fits under the transcription service's size limit (Groq: 25 Mo,
 * a 2 h call recorded in the app is ~36 Mo). Pure byte work, no decoding.
 *
 * Each piece is the file's header (EBML header, Segment of unknown size, Info,
 * Tracks) followed by whole clusters, their timecodes shifted so the piece
 * starts at 0; `startSeconds` says where it sits in the whole recording.
 * Anything not understood returns null: the caller sends the file as is.
 */

export type AudioPiece = { audio: Uint8Array; startSeconds: number };

const ID = {
  ebml: 0x1a45dfa3,
  segment: 0x18538067,
  info: 0x1549a966,
  tracks: 0x1654ae6b,
  cluster: 0x1f43b675,
  timecodeScale: 0x2ad7b1,
  timecode: 0xe7,
} as const;

// Level-1 elements: an unknown-size cluster ends where one of them starts.
const LEVEL1 = new Set([
  ID.cluster,
  ID.info,
  ID.tracks,
  0x114d9b74, // SeekHead
  0x1c53bb6b, // Cues
  0x1254c367, // Tags
  0x1043a770, // Chapters
  0x1941a469, // Attachments
]);

const UNKNOWN_SIZE = Uint8Array.of(
  0x01,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
);

type Vint = { value: number; length: number; unknown: boolean };

/** An element ID keeps its marker bit; a size drops it. */
function readVint(bytes: Uint8Array, at: number, keepMarker: boolean) {
  const first = bytes[at];
  if (first === undefined || first === 0) return null;
  const length = Math.clz32(first) - 23;
  if (at + length > bytes.length) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = value === 0xff >> length;
  for (let i = 1; i < length; i++) {
    const byte = bytes[at + i]!;
    value = value * 256 + byte;
    allOnes &&= byte === 0xff;
  }
  return { value, length, unknown: !keepMarker && allOnes } satisfies Vint;
}

type Element = {
  id: number;
  start: number;
  dataStart: number;
  // null: unknown size (written live by the recorder).
  end: number | null;
};

function readElement(bytes: Uint8Array, at: number): Element | null {
  const id = readVint(bytes, at, true);
  if (!id) return null;
  const size = readVint(bytes, at + id.length, false);
  if (!size) return null;
  const dataStart = at + id.length + size.length;
  return {
    id: id.value,
    start: at,
    dataStart,
    end: size.unknown ? null : dataStart + size.value,
  };
}

function readUint(bytes: Uint8Array, from: number, to: number): number {
  let value = 0;
  for (let i = from; i < to; i++) value = value * 256 + bytes[i]!;
  return value;
}

type Cluster = {
  start: number;
  end: number;
  // Position and width of the Timecode value, to shift it.
  timecodeAt: number;
  timecodeWidth: number;
  timecode: number;
};

/** Children of an unknown-size cluster, up to the next level-1 element. */
function clusterEnd(bytes: Uint8Array, cluster: Element): number | null {
  if (cluster.end !== null) return Math.min(cluster.end, bytes.length);
  let at = cluster.dataStart;
  while (at < bytes.length) {
    const child = readElement(bytes, at);
    // A cut tail (the last piece of a take) ends the cluster.
    if (!child) return at;
    if (LEVEL1.has(child.id)) return at;
    if (child.end === null) return null;
    at = child.end;
  }
  return bytes.length;
}

function readCluster(bytes: Uint8Array, el: Element): Cluster | null {
  const end = clusterEnd(bytes, el);
  if (end === null) return null;
  let at = el.dataStart;
  while (at < end) {
    const child = readElement(bytes, at);
    if (!child || child.end === null) return null;
    if (child.id === ID.timecode) {
      return {
        start: el.start,
        end,
        timecodeAt: child.dataStart,
        timecodeWidth: child.end - child.dataStart,
        timecode: readUint(bytes, child.dataStart, child.end),
      };
    }
    at = child.end;
  }
  return null;
}

type Parsed = {
  header: Uint8Array;
  clusters: Cluster[];
  // Nanoseconds per timecode unit (Info › TimecodeScale, 1 ms by default).
  scale: number;
};

function parse(bytes: Uint8Array): Parsed | null {
  const ebml = readElement(bytes, 0);
  if (!ebml || ebml.id !== ID.ebml || ebml.end === null) return null;
  const segment = readElement(bytes, ebml.end);
  if (!segment || segment.id !== ID.segment) return null;

  const head: Uint8Array[] = [];
  const clusters: Cluster[] = [];
  let scale = 1_000_000;
  const segmentEnd = Math.min(segment.end ?? bytes.length, bytes.length);
  let at = segment.dataStart;
  while (at < segmentEnd) {
    const el = readElement(bytes, at);
    if (!el) break;
    if (el.id === ID.cluster) {
      const cluster = readCluster(bytes, el);
      if (!cluster) return null;
      clusters.push(cluster);
      at = cluster.end;
      continue;
    }
    if (el.end === null) return null;
    if (el.id === ID.info || el.id === ID.tracks)
      head.push(bytes.subarray(el.start, el.end));
    if (el.id === ID.info) {
      let child = el.dataStart;
      while (child < el.end) {
        const c = readElement(bytes, child);
        if (!c || c.end === null) break;
        if (c.id === ID.timecodeScale)
          scale = readUint(bytes, c.dataStart, c.end);
        child = c.end;
      }
    }
    at = el.end;
  }
  if (clusters.length === 0 || head.length < 2) return null;

  // The Segment keeps its ID, its size becomes « unknown »: a piece is shorter.
  const segmentId = readVint(bytes, segment.start, true)!;
  const header = concat([
    bytes.subarray(0, ebml.end),
    bytes.subarray(segment.start, segment.start + segmentId.length),
    UNKNOWN_SIZE,
    ...head,
  ]);
  return { header, clusters, scale };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0));
  parts.reduce((offset, p) => (out.set(p, offset), offset + p.byteLength), 0);
  return out;
}

function writeUint(
  out: Uint8Array,
  at: number,
  width: number,
  value: number,
): void {
  for (let i = width - 1; i >= 0; i--) {
    out[at + i] = value % 256;
    value = Math.floor(value / 256);
  }
}

function buildPiece(bytes: Uint8Array, parsed: Parsed, group: Cluster[]) {
  const base = group[0]!.timecode;
  const body = concat(group.map((c) => bytes.subarray(c.start, c.end)));
  const offset = group[0]!.start;
  for (const c of group)
    writeUint(body, c.timecodeAt - offset, c.timecodeWidth, c.timecode - base);
  return {
    audio: concat([parsed.header, body]),
    startSeconds: (base * parsed.scale) / 1e9,
  };
}

/**
 * The recording in pieces of at most `maxBytes` (whole clusters), or null
 * when the file is not a WebM this code can read or a single cluster is
 * already too big.
 */
export function splitWebm(
  bytes: Uint8Array,
  maxBytes: number,
): AudioPiece[] | null {
  const parsed = parse(bytes);
  if (!parsed) return null;
  const room = maxBytes - parsed.header.byteLength;

  const pieces: AudioPiece[] = [];
  let group: Cluster[] = [];
  let size = 0;
  for (const cluster of parsed.clusters) {
    const length = cluster.end - cluster.start;
    if (length > room) return null;
    if (size + length > room) {
      pieces.push(buildPiece(bytes, parsed, group));
      group = [];
      size = 0;
    }
    group.push(cluster);
    size += length;
  }
  if (group.length > 0) pieces.push(buildPiece(bytes, parsed, group));
  return pieces;
}

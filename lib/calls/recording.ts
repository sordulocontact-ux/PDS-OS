/**
 * A call recorded in the app, as saved while it happens (PROJ-BUG-01). Pure
 * functions shared by the server (page load, assembly) and the recorder.
 *
 * A take is one continuous recording session; its pieces, uploaded every
 * PIECE_MS, are saved in order. Only a piece whose row is written counts as
 * saved: what the browser still holds is « en attente », never « sauvegardé ».
 */

/** Recorded time per piece: at most this much is lost when a tab dies. */
export const PIECE_MS = 20 * 1000;
/** Between two takes, under this long is the time to restart, not a gap. */
export const GAP_TOLERANCE_MS = 10 * 1000;

export type SavedPiece = { seq: number; endMs: number; savedAt: string };

export type SavedTake = {
  id: string;
  take: number;
  startedAt: string;
  // Recorded time saved without a hole from the start of the take.
  savedMs: number;
  // When the last of those pieces was written (wall clock).
  lastSavedAt: string | null;
  pieces: number;
};

export type RecordingGap = { from: string; to: string; ms: number };

/**
 * The pieces a take can be assembled from: in order from seq 0, up to the
 * first missing one (a later piece without the one before would corrupt the
 * file; the recorder uploads them in order, so this only cuts a broken tail).
 */
export function contiguousPieces<T extends { seq: number }>(pieces: T[]): T[] {
  const sorted = [...pieces].sort((a, b) => a.seq - b.seq);
  const kept: T[] = [];
  for (const piece of sorted) {
    if (piece.seq !== kept.length) break;
    kept.push(piece);
  }
  return kept;
}

export function toSavedTake(take: {
  id: string;
  take: number;
  startedAt: string;
  pieces: SavedPiece[];
}): SavedTake {
  const kept = contiguousPieces(take.pieces);
  const last = kept.at(-1);
  return {
    id: take.id,
    take: take.take,
    startedAt: take.startedAt,
    savedMs: last?.endMs ?? 0,
    lastSavedAt: last?.savedAt ?? null,
    pieces: kept.length,
  };
}

/** Takes that hold something, in order. */
export function filledTakes(takes: SavedTake[]): SavedTake[] {
  return takes.filter((t) => t.pieces > 0).sort((a, b) => a.take - b.take);
}

export function savedMs(takes: SavedTake[]): number {
  return filledTakes(takes).reduce((sum, t) => sum + t.savedMs, 0);
}

/**
 * Missing audio between two takes: from the last saved piece of one (what
 * followed it was never saved) to the start of the next.
 */
export function recordingGaps(takes: SavedTake[]): RecordingGap[] {
  const filled = filledTakes(takes);
  return filled.slice(1).flatMap((take, i) => {
    const before = filled[i]!.lastSavedAt;
    if (!before) return [];
    const ms = Date.parse(take.startedAt) - Date.parse(before);
    return ms > GAP_TOLERANCE_MS
      ? [{ from: before, to: take.startedAt, ms }]
      : [];
  });
}

/** Last moment the recording is known to be saved up to (wall clock). */
export function lastSavedAt(takes: SavedTake[]): string | null {
  return filledTakes(takes).at(-1)?.lastSavedAt ?? null;
}

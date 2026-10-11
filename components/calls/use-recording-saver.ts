"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RecorderFormat } from "@/components/calls/use-recorder";
import { AUDIO_BUCKET } from "@/lib/calls/constants";
import { PIECE_MS, type SavedTake } from "@/lib/calls/recording";
import { beginRecordingTake } from "@/lib/calls/recording-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Saves a call recording while it happens (PROJ-BUG-01): the recorder's
 * slices are grouped into pieces of PIECE_MS, uploaded one after the other
 * (in order: a take is its pieces end to end), each retried until it passes.
 * A piece counts as saved only once its row is written.
 */

type Piece = {
  takeId: string;
  seq: number;
  blob: Blob;
  endMs: number;
  path: string;
};

type Current = {
  id: string;
  mime: string;
  ext: string;
  seq: number;
  buffer: Blob[];
  recordedMs: number;
  nextCutMs: number;
};

const RETRY_MS = [2000, 5000, 10_000, 30_000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function savePiece(organizationId: string, callId: string, piece: Piece) {
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(piece.path, piece.blob, {
      contentType: piece.blob.type,
      upsert: false,
    });
  // Already there: the previous attempt reached Storage, not the table.
  const exists =
    uploadError &&
    ((uploadError as { statusCode?: string }).statusCode === "409" ||
      /exists/i.test(uploadError.message));
  if (uploadError && !exists) return false;
  const { error } = await supabase.from("call_recording_pieces").upsert(
    {
      take_id: piece.takeId,
      call_id: callId,
      organization_id: organizationId,
      seq: piece.seq,
      path: piece.path,
      bytes: piece.blob.size,
      end_ms: piece.endMs,
    },
    { onConflict: "take_id,seq", ignoreDuplicates: true },
  );
  return !error;
}

export function useRecordingSaver({
  callId,
  organizationId,
  saved,
}: {
  callId: string;
  organizationId: string;
  // Takes found on the server when the page loaded (a reload, a crash).
  saved: SavedTake[];
}) {
  const [takes, setTakes] = useState<SavedTake[]>(saved);
  // Recorded time of the current take, and how much of it is not saved yet.
  const [recordedMs, setRecordedMs] = useState(0);
  const [failing, setFailing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const current = useRef<Current | null>(null);
  const queue = useRef<Piece[]>([]);
  const pumping = useRef(false);
  const alive = useRef(true);
  const idle = useRef<Array<() => void>>([]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const settle = useCallback(() => {
    if (queue.current.length > 0 || current.current?.buffer.length) return;
    idle.current.splice(0).forEach((resolve) => resolve());
  }, []);

  const pump = useCallback(async () => {
    if (pumping.current) return;
    pumping.current = true;
    let attempt = 0;
    while (alive.current && queue.current[0]) {
      const piece = queue.current[0];
      if (await savePiece(organizationId, callId, piece)) {
        queue.current.shift();
        attempt = 0;
        setFailing(false);
        const at = new Date().toISOString();
        setTakes((all) =>
          all.map((t) =>
            t.id === piece.takeId
              ? {
                  ...t,
                  savedMs: piece.endMs,
                  lastSavedAt: at,
                  pieces: piece.seq + 1,
                }
              : t,
          ),
        );
      } else {
        setFailing(true);
        await sleep(RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)]!);
      }
    }
    pumping.current = false;
    settle();
  }, [callId, organizationId, settle]);

  /** Closes the piece being filled and sends it. */
  const cut = useCallback(() => {
    const take = current.current;
    if (!take || take.buffer.length === 0) return;
    const seq = take.seq++;
    queue.current.push({
      takeId: take.id,
      seq,
      blob: new Blob(take.buffer, { type: take.mime }),
      endMs: take.recordedMs,
      path: `${organizationId}/${callId}/takes/${take.id}/${seq}.${take.ext}`,
    });
    take.buffer = [];
    take.nextCutMs = take.recordedMs + PIECE_MS;
    void pump();
  }, [callId, organizationId, pump]);

  /** Before recording: open the take. Without it nothing would be saved. */
  const prepare = useCallback(
    async (format: RecorderFormat) => {
      const begun = await beginRecordingTake({ callId, mime: format[1] }).catch(
        () => null,
      );
      if (!begun?.ok) return false;
      current.current = {
        id: begun.take.id,
        mime: format[1],
        ext: format[2],
        seq: 0,
        buffer: [],
        recordedMs: 0,
        nextCutMs: PIECE_MS,
      };
      setRecordedMs(0);
      setCurrentId(begun.take.id);
      setTakes((all) => [
        ...all,
        {
          id: begun.take.id,
          take: begun.take.take,
          startedAt: begun.take.startedAt,
          savedMs: 0,
          lastSavedAt: null,
          pieces: 0,
        },
      ]);
      return true;
    },
    [callId],
  );

  const onChunk = useCallback(
    (chunk: Blob, recorded: number) => {
      const take = current.current;
      if (!take) return;
      take.buffer.push(chunk);
      take.recordedMs = recorded;
      setRecordedMs(recorded);
      if (recorded >= take.nextCutMs) cut();
    },
    [cut],
  );

  /** Resolves once everything recorded so far is saved. */
  const whenSaved = useCallback(() => {
    cut();
    return new Promise<void>((resolve) => {
      idle.current.push(resolve);
      settle();
    });
  }, [cut, settle]);

  const currentTake = takes.find((t) => t.id === currentId);
  return {
    takes,
    recordedMs,
    // Recorded in this take but not confirmed saved yet.
    unsavedMs: currentTake ? Math.max(0, recordedMs - currentTake.savedMs) : 0,
    failing,
    prepare,
    onChunk,
    // The recorder stopped: send what is left.
    flush: cut,
    whenSaved,
    forget: () => {
      current.current = null;
      queue.current = [];
      setCurrentId(null);
      setTakes([]);
      setRecordedMs(0);
    },
  };
}

"use client";

import { useEffect, useRef, useState } from "react";

import type { CalendarEvent } from "@/lib/calls/calendar";

const DAY = 24 * 60;
// A new slot is drawn by half hours, a call moves by quarter hours (Teams).
const DRAW_STEP = 30;
const MOVE_STEP = 15;
// Below this distance (px), a press is a click, not a drag.
const DRAG_THRESHOLD = 4;

type Place = { day: string; start: number; end: number };

export type GridPreview =
  | ({ kind: "draw" } & Place)
  | ({ kind: "move" | "resize"; callId: string } & Place);

type Gesture =
  | { kind: "draw"; day: string; anchor: number; touch: boolean }
  | {
      kind: "move" | "resize";
      event: CalendarEvent;
      // Where the block was grabbed, in minutes from its start.
      offset: number;
      x: number;
      y: number;
      moved: boolean;
    };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * The pointer gestures of the time grid, as in Teams: press and drag on a
 * free slot to draw a new meeting (a click = half an hour), drag one of your
 * calls to move it (to another day too), drag its bottom edge to stretch it.
 * Escape cancels. Columns are found by their day (`columnOf`); one hour is
 * `hourPx()` pixels tall.
 */
export function useGridDrag({
  days,
  columnOf,
  hourPx,
  onDraw,
  onMove,
}: {
  days: string[];
  columnOf: (day: string) => HTMLElement | null;
  hourPx: () => number;
  onDraw: (place: Place) => void;
  onMove: (event: CalendarEvent, place: Place) => void;
}) {
  const [preview, setPreview] = useState<GridPreview | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const latest = useRef<GridPreview | null>(null);
  // A drag ends with a click on the block: it must not open its card.
  const swallowClick = useRef(false);
  const cleanup = useRef<() => void>(() => {});

  useEffect(() => () => cleanup.current(), []);

  const minuteAt = (day: string, clientY: number) => {
    const column = columnOf(day);
    if (!column) return 0;
    const top = column.getBoundingClientRect().top;
    return clamp(((clientY - top) / hourPx()) * 60, 0, DAY);
  };

  const dayAt = (clientX: number, fallback: string) => {
    let nearest = fallback;
    let best = Infinity;
    for (const day of days) {
      const rect = columnOf(day)?.getBoundingClientRect();
      if (!rect) continue;
      if (clientX >= rect.left && clientX < rect.right) return day;
      const distance = Math.min(
        Math.abs(clientX - rect.left),
        Math.abs(clientX - rect.right),
      );
      if (distance < best) {
        best = distance;
        nearest = day;
      }
    }
    return nearest;
  };

  const show = (next: GridPreview | null) => {
    latest.current = next;
    setPreview(next);
  };

  function follow(clientX: number, clientY: number) {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "draw") {
      if (g.touch) return;
      const minute = minuteAt(g.day, clientY);
      const start =
        minute >= g.anchor
          ? g.anchor
          : Math.floor(minute / DRAW_STEP) * DRAW_STEP;
      const end =
        minute >= g.anchor
          ? clamp(
              Math.ceil(minute / DRAW_STEP) * DRAW_STEP,
              g.anchor + DRAW_STEP,
              DAY,
            )
          : g.anchor + DRAW_STEP;
      show({ kind: "draw", day: g.day, start, end });
      return;
    }
    if (!g.moved && Math.hypot(clientX - g.x, clientY - g.y) < DRAG_THRESHOLD)
      return;
    g.moved = true;
    const { event } = g;
    const snap = (m: number) => Math.round(m / MOVE_STEP) * MOVE_STEP;
    if (g.kind === "resize") {
      const end = clamp(
        snap(minuteAt(event.day, clientY)),
        event.start + MOVE_STEP,
        DAY,
      );
      show({
        kind: "resize",
        callId: event.call.id,
        day: event.day,
        start: event.start,
        end,
      });
      return;
    }
    const day = dayAt(clientX, event.day);
    const length = event.end - event.start;
    const start = clamp(
      snap(minuteAt(day, clientY) - g.offset),
      0,
      DAY - length,
    );
    show({
      kind: "move",
      callId: event.call.id,
      day,
      start,
      end: start + length,
    });
  }

  function finish(commit: boolean) {
    const g = gesture.current;
    const place = latest.current;
    gesture.current = null;
    cleanup.current();
    show(null);
    if (!g || !commit) return;
    if (g.kind === "draw") {
      onDraw(
        place ?? { day: g.day, start: g.anchor, end: g.anchor + DRAW_STEP },
      );
      return;
    }
    if (g.moved && place) {
      // The click that follows this pointerup, if any, comes synchronously.
      swallowClick.current = true;
      setTimeout(() => {
        swallowClick.current = false;
      }, 0);
      onMove(g.event, { day: place.day, start: place.start, end: place.end });
    }
  }

  function begin(next: Gesture) {
    gesture.current = next;
    const move = (e: PointerEvent) => follow(e.clientX, e.clientY);
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    cleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  }

  /** Press on a free part of a day's column. */
  function pressColumn(day: string, e: React.PointerEvent) {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    e.preventDefault();
    const anchor = Math.floor(minuteAt(day, e.clientY) / DRAW_STEP) * DRAW_STEP;
    const touch = e.pointerType === "touch";
    begin({
      kind: "draw",
      day,
      anchor: Math.min(anchor, DAY - DRAW_STEP),
      touch,
    });
    if (!touch) follow(e.clientX, e.clientY);
  }

  /** Press on a call you may move: its body moves it, its edge stretches it. */
  function pressEvent(event: CalendarEvent, e: React.PointerEvent) {
    if (e.button !== 0 || !event.editable || e.pointerType === "touch") return;
    e.stopPropagation();
    const resize = (e.target as HTMLElement).closest("[data-resize]") !== null;
    begin({
      kind: resize ? "resize" : "move",
      event,
      offset: minuteAt(event.day, e.clientY) - event.start,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    });
  }

  /** Whether a click on a block follows a drag (then it opens nothing). */
  function consumeDragClick(): boolean {
    const swallowed = swallowClick.current;
    swallowClick.current = false;
    return swallowed;
  }

  return { preview, pressColumn, pressEvent, consumeDragClick };
}

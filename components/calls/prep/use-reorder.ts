"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

type Over = { index: number; before: boolean };

/**
 * Reordering a list three ways (proto « Projet complet », `moveAgenda`):
 * drag a row by its handle only (the text stays selectable), arrow keys on
 * the handle (focus follows the row), or the « Monter » / « Descendre »
 * buttons the row shows on touch screens. `move(from, to)` does the change.
 */
export function useReorder(
  count: number,
  move: (from: number, to: number) => void,
) {
  const [armed, setArmed] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<Over | null>(null);
  const grips = useRef<Array<HTMLButtonElement | null>>([]);
  const focusAt = useRef<number | null>(null);

  // After a move by keyboard, the handle of the moved row keeps the focus.
  useEffect(() => {
    if (focusAt.current === null) return;
    grips.current[focusAt.current]?.focus();
    focusAt.current = null;
  });

  const reset = () => {
    setArmed(null);
    setDragging(null);
    setOver(null);
  };
  const moveTo = (from: number, to: number, keepFocus = false) => {
    if (to < 0 || to >= count || from === to) return false;
    if (keepFocus) focusAt.current = to;
    move(from, to);
    return true;
  };

  const rowProps = (index: number) => ({
    draggable: armed === index,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      if (armed !== index) return e.preventDefault();
      setDragging(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (dragging === null) return;
      e.preventDefault();
      const box = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < box.top + box.height / 2;
      if (over?.index !== index || over.before !== before)
        setOver({ index, before });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (dragging === null) return;
      e.preventDefault();
      const box = e.currentTarget.getBoundingClientRect();
      let to = e.clientY >= box.top + box.height / 2 ? index + 1 : index;
      if (to > dragging) to -= 1;
      moveTo(dragging, to);
      reset();
    },
    onDragEnd: reset,
  });

  const gripProps = (index: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      grips.current[index] = el;
    },
    onPointerDown: () => setArmed(index),
    onPointerUp: () => setArmed(null),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      moveTo(index, index + (e.key === "ArrowUp" ? -1 : 1), true);
    },
  });

  return { rowProps, gripProps, dragging, over, moveTo };
}

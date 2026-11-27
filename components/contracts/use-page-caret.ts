"use client";

import { useEffect, useRef, useState } from "react";

import type { DocumentMarks } from "@/components/contracts/document-editor-toolbar";

/**
 * Where the caret last was in the contract's page — where a value is
 * inserted once a menu took the focus — and whether it is in bold or
 * underlined text, for the toolbar's pressed buttons.
 */
export function usePageCaret(page: React.RefObject<HTMLElement | null>) {
  const caret = useRef<Range | null>(null);
  const [marks, setMarks] = useState<DocumentMarks>({
    bold: false,
    underline: false,
  });

  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection();
      const root = page.current;
      if (!selection?.rangeCount || !root?.contains(selection.anchorNode))
        return;
      caret.current = selection.getRangeAt(0).cloneRange();
      setMarks({
        bold: document.queryCommandState("bold"),
        underline: document.queryCommandState("underline"),
      });
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, [page]);

  return { caret, marks };
}

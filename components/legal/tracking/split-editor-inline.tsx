"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SplitEditor } from "@/components/legal/splits/split-editor";
import { Button } from "@/components/ui/button";
import type { SplitLine } from "@/lib/legal/splits/queries";

/** The split editor inside the plan's panel (no modal over the panel):
 * open at once when nothing is written yet, behind a button otherwise. */
export function SplitEditorInline({
  projectId,
  masterId,
  initial,
  withNote,
  startOpen,
  label,
}: {
  projectId: string;
  masterId: string;
  initial: SplitLine[];
  withNote: boolean;
  startOpen: boolean;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  if (!open)
    return (
      <Button
        variant="ghost"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
    );
  return (
    <SplitEditor
      projectId={projectId}
      masterId={masterId}
      initial={initial}
      withNote={withNote}
      onDone={() => {
        setOpen(false);
        router.refresh();
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

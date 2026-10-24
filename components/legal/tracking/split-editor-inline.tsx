"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SplitEditor } from "@/components/legal/splits/split-editor";
import { Button } from "@/components/ui/button";
import type { PublishingHint } from "@/lib/legal/splits/draft";
import type { SplitLine } from "@/lib/legal/splits/queries";

/** The split editor inside the plan's panel (no modal over the panel):
 * open at once when nothing is written yet, behind a button otherwise. */
export function SplitEditorInline({
  projectId,
  masterId,
  initial,
  hints,
  version,
  startOpen,
  label,
}: {
  projectId: string;
  masterId: string;
  initial: SplitLine[];
  hints: Record<string, PublishingHint>;
  // The version a new one follows (why it changes is asked), else null.
  version: number | null;
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
      hints={hints}
      version={version}
      onDone={() => {
        setOpen(false);
        router.refresh();
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

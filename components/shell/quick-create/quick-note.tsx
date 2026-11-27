"use client";

import { usePathname } from "next/navigation";

import { NewNoteSheet } from "@/components/notes/new-note-sheet";
import { useLoaded } from "@/components/ui/use-loaded";
import { loadNoteLinkOptions } from "@/lib/notes/options";

// /app/projects/<id>/…: the project the reader is on.
const PROJECT_PATH = /^\/app\/projects\/([0-9a-f-]{36})(?:\/|$)/i;

/** « Nouvelle note » of the « + » and ⌘K: a blank note in its side sheet,
 * linked beforehand to the project of the page (changeable); its choices
 * of link are read as it opens. */
export default function QuickNote({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <QuickNoteSheet onClose={onClose} />;
}

function QuickNoteSheet({ onClose }: { onClose: () => void }) {
  const loaded = useLoaded(loadNoteLinkOptions);
  const projectId = PROJECT_PATH.exec(usePathname())?.[1];
  return (
    <NewNoteSheet
      choices={loaded.status === "ready" ? loaded.data : null}
      initial={
        projectId
          ? { link: { kind: "project", id: projectId, label: "" } }
          : undefined
      }
      onClose={onClose}
    />
  );
}

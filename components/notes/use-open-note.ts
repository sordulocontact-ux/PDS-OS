"use client";

import { usePathname, useRouter } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { viewHref } from "@/lib/ui/view-href";

// /app/projects/<id>/notes: a project's door to the notes.
const PROJECT_NOTES = /^\/app\/projects\/[0-9a-f-]{36}\/notes$/i;

/**
 * Opens a note's side sheet on the list it belongs to (`?ouvrir=`, read by
 * the table): the page one is on when it is a list of notes, else Notes.
 * The filters and the tab are dropped, so the new note is surely listed.
 */
export function useOpenNote(): (noteId: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  return (noteId) => {
    const base =
      pathname === routes.notes || PROJECT_NOTES.test(pathname)
        ? pathname
        : routes.notes;
    router.push(viewHref(base, { ouvrir: noteId }));
  };
}

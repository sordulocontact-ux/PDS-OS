"use client";

import { useRef, useState } from "react";

import { screenshotProblem } from "@/components/feedback/screenshot-field";
import { MAX_SCREENSHOTS } from "@/lib/feedback/screenshot-rules";
import type { FeedbackScreenshot } from "@/lib/feedback/types";
import { uploadFeedbackScreenshot } from "@/lib/feedback/upload-screenshot";
import { fr } from "@/lib/i18n/fr";

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const imagesOf = (data: DataTransfer) =>
  [...data.files].filter((f) => f.type.startsWith("image/"));

export type UploadedScreenshots =
  { ok: true; paths: string[] } | { ok: false; error: string };

/**
 * The screenshots of the feedback being written: those already attached
 * (`kept`, on an edit) and the new files, pasted or dropped anywhere in the
 * form, or picked. `upload` sends the new ones from the browser into the
 * author's folder, once each even on retry, and returns every path in order.
 */
export function useScreenshotAttachments({
  organizationId,
  personId,
  initialScreenshot,
  initialKept,
}: {
  organizationId: string;
  personId: string;
  initialScreenshot: File | null;
  initialKept: FeedbackScreenshot[];
}) {
  const t = fr.feedback.screenshot;
  const initialProblem = initialScreenshot
    ? screenshotProblem(initialScreenshot)
    : null;
  const [kept, setKept] = useState(initialKept);
  const [files, setFiles] = useState<File[]>(
    initialScreenshot && !initialProblem ? [initialScreenshot] : [],
  );
  const [error, setError] = useState<string | undefined>(
    initialProblem ?? undefined,
  );
  const uploaded = useRef(new Map<File, string>());

  // Keeps the valid files, up to the limit, and says why others were left.
  const attach = (added: File[]) => {
    const next = [...files];
    let problem: string | null = null;
    for (const file of added) {
      if (next.some((f) => sameFile(f, file))) continue;
      const fileProblem = screenshotProblem(file);
      if (fileProblem) problem ??= fileProblem;
      else if (kept.length + next.length >= MAX_SCREENSHOTS)
        problem ??= t.tooMany;
      else next.push(file);
    }
    setFiles(next);
    setError(problem ?? undefined);
  };

  const remove = (file: File) => {
    setFiles((current) => current.filter((f) => f !== file));
    setError(undefined);
  };

  const removeKept = (path: string) => {
    setKept((current) => current.filter((s) => s.path !== path));
    setError(undefined);
  };

  const onPaste = (event: React.ClipboardEvent) => {
    const images = imagesOf(event.clipboardData);
    if (images.length === 0) return;
    event.preventDefault();
    attach(images);
  };

  // A screenshot dropped beside the zone is attached too, instead of the
  // browser leaving the page to open it.
  const onDragOver = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  };
  const onDrop = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    attach([...event.dataTransfer.files]);
  };

  const upload = async (): Promise<UploadedScreenshots> => {
    setError(undefined);
    const uploads = await Promise.all(
      files.map(async (file) => {
        const path = uploaded.current.get(file);
        if (path) return { ok: true as const, path };
        const result = await uploadFeedbackScreenshot({
          organizationId,
          personId,
          file,
        });
        if (result.ok) uploaded.current.set(file, result.path);
        return result;
      }),
    );
    const failed = uploads.find((u) => !u.ok);
    if (failed && !failed.ok) {
      setError(failed.error);
      return { ok: false, error: failed.error };
    }
    return {
      ok: true,
      paths: [
        ...kept.map((s) => s.path),
        ...uploads.flatMap((u) => (u.ok ? [u.path] : [])),
      ],
    };
  };

  return {
    kept,
    files,
    error,
    attach,
    remove,
    removeKept,
    upload,
    dropHandlers: { onPaste, onDragOver, onDrop },
  };
}

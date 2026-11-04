"use client";

import { useState, useTransition } from "react";

import { uploadCatalogFile } from "@/lib/catalog/upload-file";

type UploadInput = Parameters<typeof uploadCatalogFile>[0];

/**
 * Sends files to the Catalogue one after the other (each upload is its own
 * request, and the progress reads « Envoi 2/3… »), then hands back the
 * files that failed with the last error. Shared by the add modal and the
 * Master's « Ajouter les pistes séparées ».
 */
export function useCatalogUpload() {
  const [done, setDone] = useState(0);
  const [pending, startTransition] = useTransition();
  const run = (
    files: File[],
    inputOf: (file: File) => UploadInput | Promise<UploadInput>,
    after: (failed: File[], lastError: string | null) => void,
  ) =>
    startTransition(async () => {
      const failed: File[] = [];
      let lastError: string | null = null;
      setDone(0);
      for (const file of files) {
        const result = await uploadCatalogFile(await inputOf(file));
        if (!result.ok) {
          failed.push(file);
          lastError = result.error;
        }
        setDone((value) => value + 1);
      }
      after(failed, lastError);
    });
  return { run, pending, done };
}

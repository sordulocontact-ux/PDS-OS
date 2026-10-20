"use client";

import { createClient } from "@/lib/supabase/client";

/** Puts a file at the one-time path the server opened (bucket
 * legal-invoices, private): true when it is there. */
export async function uploadInvoiceFile(path: string, file: File) {
  const { error } = await createClient()
    .storage.from("legal-invoices")
    .upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
  if (error) console.error("uploadInvoiceFile:", error.message);
  return !error;
}

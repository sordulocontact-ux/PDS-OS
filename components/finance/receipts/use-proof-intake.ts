"use client";

import { useEffect, useState } from "react";

import { toast } from "@/components/ui/toast";
import { addProof, readProof } from "@/lib/finance/proof-actions";
import { FINANCE_FILE_TYPES } from "@/lib/finance/file-rules";
import { uploadFinanceFile } from "@/lib/finance/upload-file";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts.upload;
const MAX_BYTES = 20 * 1024 * 1024;
// The proofs whose reading this browser already asked for (a page shown
// again does not ask twice).
const started = new Set<string>();
// The proofs read when the box opens, at most (an e-mail with many files).
const READ_ON_OPEN = 5;

/** Reads proofs one after the other; a reached quota stops (said once). */
async function readAll(ids: string[]) {
  for (const id of ids) {
    started.add(id);
    const result = await readProof(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
  }
}

/**
 * How proofs come in (lot 6): dropped files are put in finance-files,
 * become proofs, then are read, with one toast that changes its words
 * (Midday: sending → reading → done). Proofs still « to read » (sent by
 * e-mail) are read when a member of the Finance opens the box: the request
 * is theirs (docs/ARCHITECTURE.md § 5 bis).
 */
export function useProofIntake({
  organizationId,
  pending,
  canManage,
}: {
  organizationId: string | null;
  pending: string[];
  canManage: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const key = pending.join(",");

  useEffect(() => {
    if (!canManage || !key) return;
    const todo = key
      .split(",")
      .filter((id) => !started.has(id))
      .slice(0, READ_ON_OPEN);
    if (todo.length > 0) void readAll(todo);
  }, [key, canManage]);

  async function upload(files: File[]) {
    if (!organizationId || !canManage || files.length === 0) return;
    setBusy(true);
    const id = toast(t.sending(files.length), { duration: Infinity });
    const added: string[] = [];
    for (const file of files) {
      if (!FINANCE_FILE_TYPES[file.type]) {
        toast.error(t.type, { description: file.name });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(t.size, { description: file.name });
        continue;
      }
      const stored = await uploadFinanceFile(organizationId, file);
      const proof = stored.ok
        ? await addProof({
            path: stored.path,
            name: stored.name,
            mime: file.type,
          })
        : stored;
      if (!proof.ok) {
        toast.error(t.failed, { description: file.name });
        continue;
      }
      started.add(proof.id);
      added.push(proof.id);
    }
    if (added.length > 0) {
      toast(t.reading(added.length), { id, duration: Infinity });
      await readAll(added);
      toast.success(t.done(added.length), { id, description: t.doneHint });
    } else toast.dismiss(id);
    setBusy(false);
  }

  return { upload, busy };
}

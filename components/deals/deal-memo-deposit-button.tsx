"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { depositDealMemo } from "@/lib/deals/memo-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { createClient } from "@/lib/supabase/client";

const t = dealMemos.deposit;
// The bucket deal-files' limit.
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * « Déposer le memo reçu » (Sacha 23/11/2026): the label sent its deal memo
 * to the negotiator's own address, or by WhatsApp. Its PDF goes straight to
 * the deal's folder (storage RLS: whoever writes the open deal), then
 * deposit_deal_memo makes it the deal's memo, « À valider » as one received
 * by e-mail. A failed filing removes the file.
 */
export function DealMemoDepositButton({
  organizationId,
  dealId,
  variant = "outline",
  size = "sm",
}: {
  organizationId: string;
  dealId: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const deposit = (file: File) =>
    startTransition(async () => {
      if (file.type !== "application/pdf") return void toast.error(t.notPdf);
      if (file.size > MAX_BYTES) return void toast.error(t.tooLarge);
      const path = `${organizationId}/${dealId}/${crypto.randomUUID()}.pdf`;
      const bucket = createClient().storage.from("deal-files");
      const { error } = await bucket.upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) {
        console.error("[deals] memo upload failed:", error.message);
        return void toast.error(t.failed);
      }
      const result = await depositDealMemo(dealId, path, file.name);
      if (!result.ok) {
        await bucket.remove([path]);
        return void toast.error(result.error);
      }
      toast.success(t.done);
      router.refresh();
    });

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) deposit(file);
        }}
      />
      <Button
        variant={variant}
        size={size}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => input.current?.click()}
      >
        <IconPlus aria-hidden data-icon="inline-start" />
        {pending ? t.pending : t.button}
      </Button>
    </>
  );
}

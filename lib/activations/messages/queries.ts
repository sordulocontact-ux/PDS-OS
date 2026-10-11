import "server-only";

import { cache } from "react";

import type {
  MessageChannel,
  MessageKind,
  MessageStatus,
} from "@/lib/activations/model";
import { createClient } from "@/lib/supabase/server";

export type MessageRecord = {
  id: string;
  targetId: string | null;
  kind: MessageKind;
  subject: string | null;
  body: string;
  channel: MessageChannel;
  pressKitDocumentId: string | null;
  dueOn: string | null;
  derogationReason: string | null;
  status: MessageStatus;
  reviewComment: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  sentDeclaredBy: string | null;
  sentOn: string | null;
  sentProofUrl: string | null;
  sentNote: string | null;
  createdAt: string;
};

/** An activation's messages, oldest first. Cached per request. */
export const loadMessages = cache(
  async (activationId: string): Promise<MessageRecord[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activation_messages")
      .select("*")
      .eq("activation_id", activationId)
      .order("created_at");
    if (error) console.error("loadMessages:", error.message);
    return (data ?? []).map((m) => ({
      id: m.id,
      targetId: m.target_id,
      kind: m.kind as MessageKind,
      subject: m.subject,
      body: m.body,
      channel: m.channel as MessageChannel,
      pressKitDocumentId: m.press_kit_document_id,
      dueOn: m.due_on,
      derogationReason: m.derogation_reason,
      status: m.status as MessageStatus,
      reviewComment: m.review_comment,
      validatedBy: m.validated_by,
      validatedAt: m.validated_at,
      sentDeclaredBy: m.sent_declared_by,
      sentOn: m.sent_on,
      sentProofUrl: m.sent_proof_url,
      sentNote: m.sent_note,
      createdAt: m.created_at,
    }));
  },
);

"use client";

import type { FileUIPart } from "ai";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { questionOf } from "@/components/assistant/question";
import { startSharedChat } from "@/components/assistant/shared-chat";
import { routes } from "@/lib/auth/redirects";
import { financeHome } from "@/lib/i18n/fr/finance-home";
import { normalizeSearch } from "@/lib/utils/search";

const t = financeHome.ask;
const WANT = normalizeSearch(t.want);

/** The suggestions that fit what is typed: none until « je » is typed
 * towards « Je veux », then those that go on as the text does. */
function matching(typed: string, suggestions: string[]): string[] {
  const text = normalizeSearch(typed);
  if (text.length < 2) return [];
  if (WANT.startsWith(text)) return suggestions;
  if (!text.startsWith(WANT)) return [];
  const rest = text.slice(WANT.length);
  return suggestions.filter((s) => normalizeSearch(s).startsWith(rest));
}

/**
 * « Je veux… » under Finance's overview (lot 7, proto finance-midday v8):
 * PO's box; typing « Je veux » opens suggestions written by code for the
 * reader's position, narrowed as one types (closed otherwise, Sacha
 * 15/11/2026). Either
 * opens PO with the question asked, in a new conversation, as « Parler à PO »
 * does (AskPoButton, docs/ASSISTANT.md § 2 ter): PO answers from its Finance
 * reading (lib/assistant/read/finance.ts), figures computed by the code.
 */
export function FinanceAsk({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const { setOrigin } = useAssistant();
  const [typed, setTyped] = useState("");
  const shown = matching(typed, suggestions);

  function ask(text: string, images: FileUIPart[] = []) {
    // A new conversation, saved apart from the one before.
    const chat = startSharedChat();
    setOrigin({ href: routes.finance, trail: [...t.trail] });
    void chat.sendMessage(questionOf(text, images));
    router.push(routes.assistant);
  }

  return (
    <section
      aria-label={t.label}
      className="relative mx-auto flex w-full max-w-3xl flex-col gap-2"
    >
      {shown.length > 0 && (
        <ul
          aria-label={t.suggestions}
          className="absolute inset-x-0 bottom-full z-10 mb-2 flex flex-col rounded-lg border border-[color:var(--border-hairline)] bg-card p-1.5 shadow-elevation-2"
        >
          {shown.map((rest) => (
            <li key={rest}>
              <button
                type="button"
                onClick={() => ask(`${t.want} ${rest}`)}
                className="w-full rounded-md px-2 py-2 text-left text-body-md text-[color:var(--text-tertiary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="font-medium text-[color:var(--text-primary)]">
                  {t.want}
                </span>{" "}
                {rest}
              </button>
            </li>
          ))}
        </ul>
      )}
      <AssistantComposer
        onAsk={(text, images) => ask(text, images)}
        // The answer streams on PO's page, never here.
        onStop={() => {}}
        busy={false}
        compact
        onType={setTyped}
      />
      <p className="text-center text-caption text-[color:var(--text-tertiary)]">
        {t.note}
      </p>
    </section>
  );
}

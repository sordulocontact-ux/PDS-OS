// pnpm eval:po — replays PO's questions tests against a running app
// (docs/ASSISTANT.md § 5, audit of PO § 4.3). Signs in as a real member
// with Supabase (RLS, quota and rules as in the app), posts each question
// to /api/assistant, reads the stream and checks by code: the functions
// called, the forbidden ones, and the text (no URL, no Markdown, expected
// and forbidden words). Each question takes one request of the member's
// daily quota. Never run against production.
//
//   EVAL_EMAIL=… EVAL_PASSWORD=… pnpm eval:po [--base http://localhost:3000] [--only id]
//   (pré-prod : EVAL_REMOTE=1 … --base <url de la pré-prod>)
import { createServerClient } from "@supabase/ssr";

import { CASES } from "./eval-po-cases.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const BASE = arg("base") ?? "http://localhost:3000";
const ONLY = arg("only");
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } =
  process.env;
const { EVAL_EMAIL: email, EVAL_PASSWORD: password } = process.env;

if (!url || !key || !email || !password) {
  console.error(
    "Il faut NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, EVAL_EMAIL et EVAL_PASSWORD.",
  );
  process.exit(2);
}
// Local by default; a remote app (the pré-prod) only when asked by name.
if (
  !/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE) &&
  !process.env.EVAL_REMOTE
) {
  console.error(
    "Refusé : hors local, ajoutez EVAL_REMOTE=1 (pré-prod seulement, jamais la production).",
  );
  process.exit(2);
}

/** The session cookies, exactly as @supabase/ssr writes them for the app. */
async function sessionCookie() {
  let jar = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => jar,
      setAll: (cookies) => {
        jar = cookies.map(({ name, value }) => ({ name, value }));
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Connexion refusée : ${error.message}`);
  return jar.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** One question: the functions called and the text, read from the stream. */
async function ask(cookie, question, page) {
  const response = await fetch(`${BASE}/api/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: question }],
        },
      ],
      ...(page && { page }),
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = await response.text();
  const tools = new Set();
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    let chunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      continue;
    }
    if (chunk.toolName) tools.add(chunk.toolName);
    if (chunk.type === "text-delta" && typeof chunk.delta === "string")
      text += chunk.delta;
  }
  return { tools: [...tools], text: text.trim() };
}

function check(test, { tools, text }) {
  const failures = [];
  if (test.tools && !test.tools.some((t) => tools.includes(t)))
    failures.push(`aucune de ${test.tools.join(", ")} appelée`);
  for (const t of test.noTools ?? [])
    if (tools.includes(t)) failures.push(`${t} appelée`);
  if (test.says && !test.says.test(text)) failures.push(`attendu ${test.says}`);
  if (test.never && test.never.test(text))
    failures.push(`interdit ${test.never}`);
  if (/https?:\/\//.test(text)) failures.push("URL écrite par le modèle");
  if (/\*\*|^#/m.test(text)) failures.push("Markdown");
  if (!text) failures.push("réponse vide");
  return failures;
}

const cookie = await sessionCookie();
let failed = 0;
for (const test of CASES.filter((c) => !ONLY || c.id === ONLY)) {
  const started = Date.now();
  try {
    const result = await ask(cookie, test.question, test.page);
    const failures = check(test, result);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `${failures.length ? "ÉCHEC" : "ok   "} ${test.id} (${seconds} s) · ${result.tools.join(", ") || "aucune fonction"}`,
    );
    if (failures.length) {
      failed += 1;
      console.log(
        `      ${failures.join(" ; ")}\n      « ${result.text.slice(0, 300)} »`,
      );
    }
  } catch (error) {
    failed += 1;
    console.log(`ÉCHEC ${test.id} · ${error.message}`);
  }
}
console.log(`\n${failed ? `${failed} échec(s)` : "Tout passe"}.`);
process.exit(failed ? 1 : 0);

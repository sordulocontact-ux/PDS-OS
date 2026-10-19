import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getServerEnv } from "@/lib/env";

// A private link kept visible in its démarche (proto « Projet complet »,
// rule 19) without the database ever holding a usable token: the server
// seals the token with AES-256-GCM (key LEGAL_LINK_KEY, 32 bytes in base64,
// server-only). Without the key, nothing is sealed: the démarche shows the
// link's state, and « Nouveau lien » gives a new one to copy.

const VERSION = "v1";

function key(): Buffer | null {
  const raw = getServerEnv().LEGAL_LINK_KEY;
  if (!raw) return null;
  const buffer = Buffer.from(raw, "base64");
  return buffer.length === 32 ? buffer : null;
}

/** The token sealed for storage, or null when no key is set. */
export function sealLinkToken(token: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const sealed = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, sealed]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

/** The token back, or null (no key, another key, altered value). */
export function unsealLinkToken(sealed: string | null): string | null {
  const k = key();
  if (!k || !sealed) return null;
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      k,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// A secret stored without the database ever holding a usable value: the
// server seals it with AES-256-GCM under a key of its environment (32 bytes
// in base64). Used by the Juridique's private links (LEGAL_LINK_KEY) and the
// members' Google tokens (GOOGLE_TOKEN_KEY).

const VERSION = "v1";

/** The 32-byte key read from a base64 value, or null when absent or wrong. */
export function sealKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const buffer = Buffer.from(raw, "base64");
  return buffer.length === 32 ? buffer : null;
}

/** The text sealed for storage, or null when there is no key. */
export function seal(key: Buffer | null, text: string): string | null {
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const sealed = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, sealed]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

/** The text back, or null (no key, another key, altered value). */
export function unseal(
  key: Buffer | null,
  sealed: string | null,
): string | null {
  if (!key || !sealed) return null;
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
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

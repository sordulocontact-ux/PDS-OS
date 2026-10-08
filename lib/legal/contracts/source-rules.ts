// What a template's source file may be (ticket Juridique 03, « fichier
// source »): where it is kept, its formats and size. Client-safe.

export const TEMPLATE_SOURCE_BUCKET = "contract-template-sources";

export const SOURCE_EXTENSIONS = ["docx", "pdf", "txt", "md"] as const;
export type SourceExtension = (typeof SOURCE_EXTENSIONS)[number];

// The bucket's own limit (migration 20261007000301).
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export const SOURCE_ACCEPT = SOURCE_EXTENSIONS.map((e) => `.${e}`).join(",");

export const sourceExtensionOf = (name: string): SourceExtension | null => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return (SOURCE_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as SourceExtension)
    : null;
};

// What a file is, for its coloured icon in every table of files and for how
// its preview is drawn (FilePreview). Client-safe, from the name's extension
// first (a browser often sends no type, or a vague one), then the MIME type.

import {
  fileExtension,
  isAudioFile,
  isShownImage,
} from "@/lib/catalog/file-rules";

export type FileType =
  | "pdf"
  | "sheet"
  | "text"
  | "slides"
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "other";

const EXTENSIONS: Record<string, FileType> = {
  pdf: "pdf",
  xlsx: "sheet",
  xls: "sheet",
  xlsm: "sheet",
  csv: "sheet",
  tsv: "sheet",
  numbers: "sheet",
  ods: "sheet",
  docx: "text",
  doc: "text",
  txt: "text",
  pages: "text",
  md: "text",
  rtf: "text",
  odt: "text",
  pptx: "slides",
  ppt: "slides",
  key: "slides",
  odp: "slides",
  mp4: "video",
  m4v: "video",
  mov: "video",
  webm: "video",
  avi: "video",
  mkv: "video",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
};

/** The family a file belongs to: PDF, spreadsheet, text, slides… */
export function fileType(file: { fileName: string; mime: string }): FileType {
  const ext = fileExtension(file.fileName);
  const byName = ext ? EXTENSIONS[ext] : undefined;
  if (byName) return byName;
  if (file.mime.startsWith("image/")) return "image";
  if (isAudioFile({ name: file.fileName, type: file.mime })) return "audio";
  if (file.mime.startsWith("audio/")) return "audio";
  if (file.mime.startsWith("video/")) return "video";
  if (file.mime === "application/pdf") return "pdf";
  if (file.mime.startsWith("text/")) return "text";
  return "other";
}

/** How the preview draws a file; `none` = its icon and « Télécharger ». */
export type PreviewKind =
  "pdf" | "image" | "audio" | "video" | "csv" | "text" | "none";

// Read as plain text and shown as is (lyrics, subtitles, notes).
const TEXT_EXTENSIONS = new Set(["txt", "md", "json", "log", "lrc", "srt"]);
// What the browsers play in a <video> (a .mov is H.264 most of the time).
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "mov", "webm"]);

export function previewKind(file: {
  fileName: string;
  mime: string;
}): PreviewKind {
  const ext = fileExtension(file.fileName) ?? "";
  const type = fileType(file);
  if (type === "pdf") return "pdf";
  if (type === "image") return isShownImage(file.mime) ? "image" : "none";
  if (type === "audio") return "audio";
  if (type === "video")
    return VIDEO_EXTENSIONS.has(ext) || file.mime.startsWith("video/mp4")
      ? "video"
      : "none";
  if (ext === "csv" || ext === "tsv" || file.mime === "text/csv") return "csv";
  if (TEXT_EXTENSIONS.has(ext) || file.mime === "text/plain") return "text";
  return "none";
}

/** A file as its preview shows it, from any table of files. */
export type PreviewFile = {
  id: string;
  fileName: string;
  mime: string;
  bytes: number | null;
  createdAt: string;
  // What it belongs to, first in the grey line under its name (« Contrat »,
  // the artist's name).
  context: string | null;
  openUrl: string | null;
  downloadUrl: string | null;
};

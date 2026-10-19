// What a file name keeps of a name or a title (« Néons » → « Neons »):
// letters and digits only, accents removed. Client-safe.
export const fileNamePart = (text: string, fallback: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "") || fallback;

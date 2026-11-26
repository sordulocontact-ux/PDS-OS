import {
  documentFontHref,
  type DocumentFont,
} from "@/lib/legal/contracts/document-fonts";

/**
 * The look of a contract's sheet on screen (the editor, a dropped contract's
 * preview): its CSS, hoisted once by `href`, and its Word file's typeface
 * when it has one.
 */
export function DocumentSheetStyle({
  scope,
  css,
  font,
}: {
  // The class of the sheet, the style's key.
  scope: string;
  css: string;
  font: DocumentFont | null;
}) {
  return (
    <>
      <style href={scope} precedence="default">
        {css}
      </style>
      {font && (
        <link
          rel="stylesheet"
          href={documentFontHref(font)}
          precedence="default"
        />
      )}
    </>
  );
}

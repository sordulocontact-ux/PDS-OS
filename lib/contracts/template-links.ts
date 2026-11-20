// Where a contract template is read as a document (Ibé, 18/11/2026: « le
// modèle en PDF »): the PDF in the browser's tab, and the same document as a
// page for the preview frame. Client-safe.

const base = (templateId: string) =>
  `/api/contracts/templates/${encodeURIComponent(templateId)}`;

export const templatePdfHref = (templateId: string) =>
  `${base(templateId)}?view=1`;

export const templatePreviewHref = (templateId: string) =>
  `${base(templateId)}?format=html`;

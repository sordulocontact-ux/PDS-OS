// What the bucket finance-files takes (20261113200102_client_invoices.sql):
// a PDF, or a capture of one. Client-safe.
export const FINANCE_FILES_BUCKET = "finance-files";

export const FINANCE_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export const FINANCE_FILE_ACCEPT = Object.keys(FINANCE_FILE_TYPES).join(",");

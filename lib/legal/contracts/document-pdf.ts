import "server-only";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * The filled document alone, for the PDF sent to signature: its text as it
 * stands, nothing added (no app branding inside a contract). Escaped: the
 * values come from people.
 */
export function documentHtml({
  title,
  body,
}: {
  title: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=block">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; font-size: 13px; line-height: 20px; }
  main { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
</head>
<body><main>${escape(body)}</main></body>
</html>`;
}

// One-off: gets the refresh token of the Google account that organizes the
// calls (GOOGLE_CALENDAR_REFRESH_TOKEN, docs/ARCHITECTURE.md § 4 bis).
//
//   node scripts/google-calendar-token.mjs <client id> <client secret>
//   (or GOOGLE_CALENDAR_CLIENT_ID / _SECRET in the environment; TOKEN_OUT=<file>
//   writes the token there, mode 600, instead of printing it)
//
// Opens a sign-in link; once the organizer's account has accepted, Google
// redirects to this local server, which trades the code for the refresh token
// and prints it. Nothing is written to disk.
//
// The link may be opened on another computer (the account's owner signs in
// there): the browser then lands on an unreachable http://127.0.0.1:<port>/?code=…
// page; paste that whole address in a browser here while this script runs.
//
// Scopes, all in one sign-in:
// - calendar.events: the calls' events and Meet links;
// - drive.file: files PDS OS itself puts in the account's Drive (e.g. a
//   session's rushes); it never sees the rest of the Drive;
// - meetings.space.settings: turns on Meet's automatic transcription of a call;
// - meetings.space.readonly: reads a call's Meet transcript afterwards.
import { createServer } from "node:http";

// From the arguments, else from the environment (never in argv then: `ps`
// shows every process's command line).
const [clientId, clientSecret] = process.argv[2]
  ? process.argv.slice(2)
  : [
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    ];
if (!clientId || !clientSecret) {
  console.error(
    "Usage: node scripts/google-calendar-token.mjs <client id> <client secret>",
  );
  process.exit(1);
}

const SCOPE = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/meetings.space.settings",
  "https://www.googleapis.com/auth/meetings.space.readonly",
].join(" ");

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const code = url.searchParams.get("code");
  if (!code) {
    response.writeHead(400).end("Missing code.");
    return;
  }
  const result = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  }).then((r) => r.json());
  response
    .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
    .end(
      result.refresh_token
        ? "C'est fait : revenez au terminal."
        : "Échec : voir le terminal.",
    );
  if (result.refresh_token && process.env.TOKEN_OUT) {
    // Written to a private file rather than shown (TOKEN_OUT, mode 600).
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.TOKEN_OUT, result.refresh_token, { mode: 0o600 });
    console.log(
      "\nJeton écrit dans " +
        process.env.TOKEN_OUT +
        " (droits : " +
        result.scope +
        ")",
    );
  } else if (result.refresh_token) {
    console.log("\nGOOGLE_CALENDAR_REFRESH_TOKEN=" + result.refresh_token);
  } else {
    console.error("\nNo refresh token:", result.error ?? result);
  }
  server.close();
});

function redirectUri() {
  const address = server.address();
  return `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
}

server.listen(0, "127.0.0.1", () => {
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    login_hint: "po@pdsrecords.com",
  }).toString();
  console.log(
    "Ouvrez ce lien avec le compte Google qui organisera les calls :\n\n" +
      auth.toString(),
  );
});

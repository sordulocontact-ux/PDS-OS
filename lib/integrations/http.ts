import "server-only";

/** Shared JSON fetcher for public music APIs: timeout, no cache, identified client. */

const USER_AGENT = "PDS-OS/0.1 (internal release tracker)";

export class IntegrationError extends Error {
  constructor(
    readonly service: string,
    readonly reason: string,
  ) {
    super(`${service}: ${reason}`);
    this.name = "IntegrationError";
  }
}

export async function fetchJson(
  service: string,
  url: string | URL,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new IntegrationError(service, "unreachable");
  }
  if (!response.ok)
    throw new IntegrationError(service, `http_${response.status}`);
  return response.json();
}

/** Same as `fetchJson`, for a public HTML page. */
export async function fetchText(
  service: string,
  url: string | URL,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new IntegrationError(service, "unreachable");
  }
  if (!response.ok)
    throw new IntegrationError(service, `http_${response.status}`);
  return response.text();
}

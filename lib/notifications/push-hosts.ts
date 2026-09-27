/**
 * Push services a browser subscription may point to (Chrome/Edge/Opera via
 * FCM, Firefox, Safari, Windows). The server POSTs to every saved endpoint:
 * any other host is refused. Same list as save_push_subscription (SQL).
 */
const PUSH_SERVICE_HOST =
  /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)$/;

export function isPushServiceUrl(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_SERVICE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

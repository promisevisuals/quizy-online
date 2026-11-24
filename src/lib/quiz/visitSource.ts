/** Name a referrer host the way the owner thinks about it: whatsapp, facebook, google… */
export function sourceFrom(search: string, referrer: string, ownHost = ""): string {
  const params = new URLSearchParams(search);
  const tagged = (params.get("ref") || params.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
  if (tagged) return tagged;
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  if (!host || (ownHost && host === ownHost)) return "direct";
  const known: [RegExp, string][] = [
    [/whatsapp|wa\.me/, "whatsapp"],
    [/facebook|fb\.|messenger/, "facebook"],
    [/instagram/, "instagram"],
    [/tiktok/, "tiktok"],
    [/(^|\.)t\.co$|twitter|x\.com/, "x"],
    [/google/, "google"],
    [/bing|yahoo|duckduckgo/, "search"],
    [/linkedin/, "linkedin"],
    [/promisevisuals\.com$/, "promisevisuals"],
  ];
  for (const [re, name] of known) if (re.test(host)) return name;
  return host.replace(/^www\./, "").replace(/[^a-z0-9._-]/g, "").slice(0, 32) || "other";
}

export function safeReturnPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || value.length > 512 || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f]/.test(value)) return fallback;
  try {
    if (!["/dashboard", "/studio", "/messages", "/settings"].includes(value.split(/[?#]/, 1)[0])) return fallback;
    const url = new URL(value, "https://kayipqr.invalid");
    return url.origin === "https://kayipqr.invalid" && ["/dashboard", "/studio", "/messages", "/settings"].includes(url.pathname) ? value : fallback;
  } catch { return fallback; }
}

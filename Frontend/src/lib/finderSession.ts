// Fragments stay out of HTTP requests and referrer headers.
export function finderChatUrl(origin: string, code: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/q/${encodeURIComponent(code.trim().toUpperCase())}#chat=${encodeURIComponent(token)}`;
}

export function finderTokenFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get("chat");
}

export function readFinderToken(code: string): string | null {
  try { return localStorage.getItem(`kq_finder_token_${code}`); }
  catch { return null; }
}

export function saveFinderToken(code: string, token: string): boolean {
  try { localStorage.setItem(`kq_finder_token_${code}`, token); return true; }
  catch { return false; }
}

export function removeFinderToken(code: string): void {
  try { localStorage.removeItem(`kq_finder_token_${code}`); } catch { /* Storage may be disabled. */ }
}

import { safeReturnPath } from "./navigation";

const KEY = "kayipqr_verification_flow";
type Flow = { id: string; token: string; email: string; redirect: string; expires: number };

export function readVerificationFlow(): Omit<Flow, "id" | "expires"> {
  const query = new URLSearchParams(window.location.search);
  const token = query.get("token") || "";
  const empty = { token: "", email: query.get("email") || "", redirect: safeReturnPath(query.get("redirect")) };
  if (token) {
    let expires = Date.now() + 15 * 60 * 1000;
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (Number.isFinite(payload.exp)) expires = Math.min(payload.exp * 1000, Date.now() + 86400000);
    } catch { /* Server validates the signature; this only bounds browser retention. */ }
    const flow: Flow = { ...empty, token, expires, id: crypto.randomUUID() };
    try { sessionStorage.setItem(KEY, JSON.stringify(flow)); } catch { /* The current link still works without storage. */ }
    window.history.replaceState({ ...window.history.state, kqVerification: flow.id }, "", window.location.pathname);
    return flow;
  }
  try {
    const flow: Flow | null = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (flow && flow.id === window.history.state?.kqVerification && flow.expires > Date.now() && flow.token.length <= 8192) {
      return { ...flow, redirect: safeReturnPath(flow.redirect) };
    }
    if (flow && flow.expires <= Date.now()) sessionStorage.removeItem(KEY);
  } catch { /* An ordinary verification request should remain usable. */ }
  return empty;
}

export function clearVerificationFlow() {
  try { sessionStorage.removeItem(KEY); } catch {}
}

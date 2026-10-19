import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseMessageMedia(content: string): { image: string | null; text: string } {
  const pattern = /(?:📷\s*)?\[(?:Fotoğraf(?:\s*\/\s*Photo)?|Photo)\]\(([^)]+)\)/i;
  const match = content.match(pattern);
  const candidate = match?.[1] || (/^\/uploads\/[^\s]+$/.test(content) ? content : null);
  const image = candidate && (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(candidate) || /^https?:\/\//i.test(candidate)) ? candidate : null;
  return { image, text: image ? (match ? content.replace(pattern, "").trim() : "") : content };
}

/**
 * Safely decodes HTML-escaped entities (&amp;, &lt;, &gt;, &quot;, &#x27;, &#39;, &#039;)
 * from backend-sanitized text strings.
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&#x27;/gi, "'")
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}


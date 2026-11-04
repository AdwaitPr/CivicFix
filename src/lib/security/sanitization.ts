/**
 * Deterministic server-side HTML/XSS tag stripper and event handler guard.
 * Strips complete <script>...</script> and <style>...</style> blocks,
 * removes all other HTML tags, and cleans dangerous javascript: protocols and handlers.
 */
export function sanitizePlainText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

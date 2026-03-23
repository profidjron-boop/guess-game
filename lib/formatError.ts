/**
 * Supabase RPC / PostgREST / fetch errors may be Error, PostgrestError, or plain objects.
 * Avoid String(plainObject) → "[object Object]" in UI.
 */
export function formatUnknownError(e: unknown): string {
  if (e == null) return "";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || e.name || "Error";
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.length > 0) {
      return o.message;
    }
    const nested = o.error;
    if (typeof nested === "string" && nested.length > 0) return nested;
    if (nested && typeof nested === "object") {
      const inner = (nested as Record<string, unknown>).message;
      if (typeof inner === "string" && inner.length > 0) return inner;
    }
    if (typeof o.details === "string" && o.details.length > 0) {
      return o.details;
    }
    if (typeof o.hint === "string" && o.hint.length > 0) {
      return o.hint;
    }
    if (typeof o.code === "string" && o.code.length > 0) {
      return o.code;
    }
    try {
      return JSON.stringify(o);
    } catch {
      return Object.prototype.toString.call(e);
    }
  }
  return String(e);
}

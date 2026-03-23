import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton: avoids re-creating WebSocket connections on hot reload.
// IMPORTANT: Next.js prerender can import this module on the server during build.
// Do not throw if env vars are not present yet.
const safeUrl = supabaseUrl ?? "http://localhost:54321";
const safeAnonKey = supabaseAnonKey ?? "anon_placeholder_key";

export const supabase = createClient(safeUrl, safeAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});


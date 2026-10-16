import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure WebSocket is defined in Node.js runtime environments (Node 18/20 CI runners)
// Prevents @supabase/realtime-js from throwing "Node.js detected but native WebSocket not found"
if (typeof globalThis.WebSocket === 'undefined') {
  class NodeWebSocketFallback {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 3;
    binaryType = 'blob';
    bufferedAmount = 0;
    extensions = '';
    protocol = '';
    url = '';
    onclose = null;
    onerror = null;
    onmessage = null;
    onopen = null;
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
    send() {}
    close() {}
  }
  (globalThis as any).WebSocket = NodeWebSocketFallback;
}

const DEFAULT_SUPABASE_URL = 'http://localhost:8000';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyMTc0MzI5LCJleHAiOjE5NDk4NTQzMjl9.LAXhM4gFBYfOr5bStoFMn77aK0MdRu6z6fVHrzzInPc';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('your-project-id.supabase.co')
  );
}

/**
 * Browser / Authenticated User Supabase Client (Enforces RLS policies)
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server Service-Role Supabase Client (Used by WhatsApp Ingestion Webhook to insert pending student logs)
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
}

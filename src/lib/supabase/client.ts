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

const DEFAULT_SUPABASE_URL = 'https://dqrdhvrunmnufxpcxnuq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxcmRodnJ1bm1udWZ4cGN4bnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTcwNDcsImV4cCI6MjEwNzM3MzA0N30.vZ7QF5DLf1KG_pDA9p_b_dsZ2ELG30im1NeoI365dAg';

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

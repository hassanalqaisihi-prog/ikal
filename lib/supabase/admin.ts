import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS. Server only. Used just to read a user's email
// address and to mark the welcome email as sent.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

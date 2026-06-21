import { createClient } from '@supabase/supabase-js';

// Solo usar en API routes (server-side). Nunca en el browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

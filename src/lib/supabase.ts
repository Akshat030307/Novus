/**
 * Step 14. Client and auth.
 *
 * One table is enough:
 *   saves ( user_id uuid, slot int, state jsonb, updated_at timestamptz )
 * Turn on row level security so a player can only read and write their own row.
 *
 * Install @supabase/supabase-js when you get here. Keys come from .env —
 * see .env.example.
 */
export {}

-- PickUp — auto-provision a profiles row on signup
--
-- The `profiles` table is the source of truth for every foreign key in the app
-- (`games.host_id`, `game_participants.user_id`, `game_events.created_by`), but
-- `signUp` only writes `auth.users`. This trigger bridges the gap so a fresh
-- signup immediately has a usable profile.
--
-- Zero-Trust note: this runs SECURITY DEFINER as the migration owner and only
-- ever writes into `public.profiles`. No existing RLS policy is altered, and no
-- policy is weakened. RLS still governs all client-side access to `profiles`.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username      TEXT;
  candidate_username TEXT;
  suffix             INTEGER := 0;
BEGIN
  -- Idempotent: if this auth user already has a profile (e.g. a replayed
  -- trigger), leave it alone.
  IF EXISTS (SELECT 1 FROM profiles WHERE id = new.id) THEN
    RETURN new;
  END IF;

  -- Prefer the username supplied via raw_user_meta_data. If it is missing or
  -- blank, fall back to the sanitized email local part (lowercased, all
  -- non-alphanumerics stripped). If that is still empty, derive one from the
  -- user id so `username NOT NULL` can never trip.
  base_username := COALESCE(
    NULLIF(btrim(new.raw_user_meta_data->>'username'), ''),
    NULLIF(
      regexp_replace(
        lower(split_part(COALESCE(new.email, ''), '@', 1)),
        '[^a-z0-9]',
        '',
        'g'
      ),
      ''
    ),
    'user' || substr(new.id::text, 1, 8)
  );

  -- Resolve username collisions without ever crashing the trigger: on a
  -- unique violation, append a numeric suffix and retry until one is free.
  candidate_username := base_username;
  LOOP
    BEGIN
      INSERT INTO profiles (id, username)
      VALUES (new.id, candidate_username);
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        suffix := suffix + 1;
        candidate_username := base_username || '_' || suffix::text;
    END;
  END LOOP;

  RETURN new;
END;
$$;

-- Idempotent trigger creation (safe to re-run the migration).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

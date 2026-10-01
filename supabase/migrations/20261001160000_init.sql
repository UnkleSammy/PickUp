-- PickUp — initial schema (v1)
-- Zero-Trust baseline: every table has Row-Level Security enabled with the exact
-- policies from PICKUP_SPEC.md. No policy is weakened or invented.

-- ============================================================================
-- 1. Profiles
-- ============================================================================
CREATE TYPE athletic_role AS ENUM ('player', 'referee', 'timekeeper', 'admin');

CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    trust_score NUMERIC DEFAULT 5.0 CHECK (trust_score >= 0.0 AND trust_score <= 5.0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================================
-- 2. Games
-- ============================================================================
CREATE TYPE game_status AS ENUM ('scheduling', 'lobby', 'live', 'completed', 'cancelled');

CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES profiles(id) NOT NULL,
    sport TEXT NOT NULL,
    rules_text TEXT NOT NULL,
    rules_penalties JSONB NOT NULL, -- { fouls_limit: integer, penalty_type: string, half_duration_mins: integer }
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    court_name TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status game_status DEFAULT 'scheduling' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to games" ON games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow hosts to update games" ON games FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- ============================================================================
-- 3. Game Participants
-- ============================================================================
CREATE TYPE participant_role AS ENUM ('player', 'referee', 'timekeeper');
CREATE TYPE invite_status AS ENUM ('invited', 'accepted', 'declined', 'checked_in');

CREATE TABLE game_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role participant_role DEFAULT 'player' NOT NULL,
    status invite_status DEFAULT 'invited' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, user_id)
);

ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read participants of games" ON game_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert participant status" ON game_participants FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR auth.uid() = (SELECT host_id FROM games WHERE id = game_id)
);
CREATE POLICY "Update participant status" ON game_participants FOR UPDATE TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = (SELECT host_id FROM games WHERE id = game_id)
);

-- ============================================================================
-- 4. Live Game Events
-- ============================================================================
CREATE TYPE event_type AS ENUM ('score_change', 'timer_start', 'timer_pause', 'penalty_foul', 'game_end');

CREATE TABLE game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    event_type event_type NOT NULL,
    event_data JSONB NOT NULL, -- { player_id: UUID, points: integer, penalty_name: string }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read events for game" ON game_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write live events" ON game_events FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = (SELECT host_id FROM games WHERE id = game_id) OR
    EXISTS (
        SELECT 1 FROM game_participants
        WHERE game_id = game_events.game_id
        AND user_id = auth.uid()
        AND role IN ('referee', 'timekeeper')
        AND status = 'checked_in'
    )
);

-- ============================================================================
-- 5. Ratings (Phase 2 scaffolding)
-- ============================================================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) NOT NULL,
    rater_id UUID REFERENCES profiles(id) NOT NULL,
    target_id UUID REFERENCES profiles(id), -- rating a player
    target_court TEXT,                     -- rating a court/field
    rating_score INTEGER CHECK (rating_score >= 1 AND rating_score <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
-- No policies yet: Phase 2 scaffolding. RLS deny-by-default is intentional (Zero Trust).

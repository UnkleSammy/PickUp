-- PickUp — invite / approval flow (Phase 2, item #2)
--
-- Closes the "anyone can self-elevate" hole in the Phase-1 participant RLS:
--   1. `games.require_approval` lets a host gate self-joins behind approval.
--   2. `game_participants.host_invited` records WHO created the row: true means
--      the host invited this person, false means they requested to join.
--   3. The two Phase-1 INSERT/UPDATE policies are replaced with policies that
--      enforce the full invite state machine. SELECT stays open (unchanged).
--
-- Invariants enforced at the database (Zero Trust — a client can never bypass):
--   * Self-insert (auth.uid() = user_id): role must be 'player', host_invited
--     must be false, and status is 'invited' when the game requires approval,
--     else 'accepted'. A self-joiner can never insert 'declined', 'checked_in',
--     or a non-player role.
--   * Host-insert (auth.uid() = host_id): may set any role with host_invited
--     true and status 'invited' (an invite) or 'accepted' (add directly). A host
--     can never insert 'checked_in'.
--   * Self-update: a user may only move their OWN row 'invited' -> 'accepted'
--     (accepting a host invite) or 'invited' -> 'declined' (declining a host
--     invite), or check in 'accepted' -> 'checked_in'. They can never accept
--     their own join request (host_invited = false) even when approval is off,
--     because open games self-join straight to 'accepted'. They can never change
--     role, host_invited, game_id, or user_id.
--   * Host-update: the host may approve/decline (status -> 'accepted'/'declined')
--     and change role on any row in their game. They can never change user_id,
--     host_invited, or game_id, nor check a row in.
--
-- Idempotent: columns/policies are guarded so re-running is safe. The two old
-- policies are dropped by exact name; nothing else is weakened.

-- ============================================================================
-- 1. Columns
-- ============================================================================
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE game_participants
  ADD COLUMN IF NOT EXISTS host_invited BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. Tightened participant RLS (replaces the two Phase-1 write policies)
-- ============================================================================
-- SELECT stays open to authenticated users (unchanged from the spec baseline).

DROP POLICY IF EXISTS "Insert participant status" ON game_participants;
DROP POLICY IF EXISTS "Update participant status" ON game_participants;

-- ---------------------------------------------------------------------------
-- INSERT: self-join vs host invite, with the exact status/role invariants.
-- ---------------------------------------------------------------------------
CREATE POLICY "Insert participant as self or host" ON game_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Self-join: always a player, always a join *request* (never an invite),
    -- and only ever 'invited' (gated) or 'accepted' (open). The scalar subquery
    -- also doubles as an existence check on `games`.
    (
      auth.uid() = user_id
      AND host_invited = false
      AND role = 'player'
      AND status = (
        SELECT CASE WHEN g.require_approval
               THEN 'invited'::invite_status
               ELSE 'accepted'::invite_status
               END
        FROM games g
        WHERE g.id = game_id
      )
    )
    OR
    -- Host invite / direct add: any role, host_invited must be true, and the
    -- status is an invite or a direct add — never a check-in.
    (
      auth.uid() = (SELECT g.host_id FROM games g WHERE g.id = game_id)
      AND host_invited = true
      AND status IN ('invited'::invite_status, 'accepted'::invite_status)
    )
  );

-- ---------------------------------------------------------------------------
-- UPDATE (self): accept/decline a host invite, or check in. Nothing else may
-- change — the OLD row is resolved via a subquery on the immutable `id`.
-- ---------------------------------------------------------------------------
CREATE POLICY "Update own participant row" ON game_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Identity/role are not self-editable.
    AND user_id  = (SELECT o.user_id  FROM game_participants o WHERE o.id = game_participants.id)
    AND game_id  = (SELECT o.game_id  FROM game_participants o WHERE o.id = game_participants.id)
    AND role     = (SELECT o.role     FROM game_participants o WHERE o.id = game_participants.id)
    AND host_invited = (SELECT o.host_invited FROM game_participants o WHERE o.id = game_participants.id)
    AND (
      -- Accept an invite the host sent you (never your own gated join request,
      -- which always has host_invited = false).
      (
        (SELECT o.status FROM game_participants o WHERE o.id = game_participants.id) = 'invited'
        AND (SELECT o.host_invited FROM game_participants o WHERE o.id = game_participants.id) = true
        AND status = 'accepted'
      )
      OR
      -- Decline an invite the host sent you.
      (
        (SELECT o.status FROM game_participants o WHERE o.id = game_participants.id) = 'invited'
        AND (SELECT o.host_invited FROM game_participants o WHERE o.id = game_participants.id) = true
        AND status = 'declined'
      )
      OR
      -- Check in (geofence remains an app-side concern).
      (
        (SELECT o.status FROM game_participants o WHERE o.id = game_participants.id) = 'accepted'
        AND status = 'checked_in'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- UPDATE (host): approve/decline and reassign role on any row in the host's
-- game. Identity columns are locked; a host can never check a row in.
-- ---------------------------------------------------------------------------
CREATE POLICY "Host updates participants in own game" ON game_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT g.host_id FROM games g WHERE g.id = game_id))
  WITH CHECK (
    auth.uid() = (SELECT g.host_id FROM games g WHERE g.id = game_id)
    AND user_id  = (SELECT o.user_id  FROM game_participants o WHERE o.id = game_participants.id)
    AND game_id  = (SELECT o.game_id  FROM game_participants o WHERE o.id = game_participants.id)
    AND host_invited = (SELECT o.host_invited FROM game_participants o WHERE o.id = game_participants.id)
    AND (
      -- A role-only edit leaves the status untouched...
      status = (SELECT o.status FROM game_participants o WHERE o.id = game_participants.id)
      OR
      -- ...or the host approves/declines. Checking in is self-only.
      status IN ('accepted'::invite_status, 'declined'::invite_status)
    )
  );

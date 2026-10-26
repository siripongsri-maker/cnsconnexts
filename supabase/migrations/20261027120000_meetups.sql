-- ============ meetups (Meetup Ping: "ชวนเจอ & ส่งสัญญาณหากัน") ============
-- Spec: docs/superpowers/specs/2026-10-27-meetup-ping-design.md §3
-- An invitation between the two participants of one connection.
-- Transitions (enforced by private.meetups_before_update):
--   pending  -> accepted | declined   invitee only
--   pending  -> cancelled             inviter only
--   accepted -> done | cancelled      either participant
-- Nothing is allowed once now() >= expires_at (except the insert trigger's
-- own cleanup of expired rows). No DELETE path for clients.
-- Errors raised here carry a stable token in the message for the client:
--   meetup_not_connection_pair · meetup_must_start_pending · meetup_immutable_column
--   meetup_expired · meetup_transition_not_allowed

-- 1) table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  inviter UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  invitee UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  signal_key UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  CONSTRAINT meetups_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'done', 'cancelled')),
  CONSTRAINT meetups_inviter_not_invitee CHECK (inviter <> invitee)
);

-- at most one live invitation (pending/accepted) per connection
CREATE UNIQUE INDEX IF NOT EXISTS meetups_one_active_per_connection
  ON public.meetups (connection_id)
  WHERE status IN ('pending', 'accepted');

-- 2) BEFORE INSERT: pair check, server-owned values, expire stale rows ---------
CREATE OR REPLACE FUNCTION private.meetups_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_user_a uuid;
  c_user_b uuid;
BEGIN
  SELECT c.user_a, c.user_b INTO c_user_a, c_user_b
  FROM public.connections c
  WHERE c.id = NEW.connection_id;

  -- {inviter, invitee} must be exactly {user_a, user_b} of the connection
  -- (one message for "no such connection" and "wrong people" so it is not an oracle)
  IF NOT FOUND OR NOT (
       (NEW.inviter = c_user_a AND NEW.invitee = c_user_b)
    OR (NEW.inviter = c_user_b AND NEW.invitee = c_user_a)
  ) THEN
    RAISE EXCEPTION 'meetup_not_connection_pair'
      USING ERRCODE = '23514',
            DETAIL = 'inviter and invitee must be the two participants of the connection';
  END IF;

  -- an invitation always starts as pending; the inviter cannot pre-accept it
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'meetup_must_start_pending' USING ERRCODE = '23514';
  END IF;

  -- server-owned values: clients cannot pick the channel key or stretch the lifetime
  NEW.signal_key := gen_random_uuid();
  NEW.created_at := now();
  NEW.responded_at := NULL;
  NEW.expires_at := now() + interval '30 minutes';

  -- expired live invitations of this connection no longer block a new one
  UPDATE public.meetups m
  SET status = 'cancelled'
  WHERE m.connection_id = NEW.connection_id
    AND m.status IN ('pending', 'accepted')
    AND m.expires_at <= now();

  RETURN NEW;
END;
$$;

-- 3) BEFORE UPDATE: only status moves, along the allowed transitions ----------
CREATE OR REPLACE FUNCTION private.meetups_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- every column except status / responded_at is frozen
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.connection_id IS DISTINCT FROM OLD.connection_id
     OR NEW.inviter IS DISTINCT FROM OLD.inviter
     OR NEW.invitee IS DISTINCT FROM OLD.invitee
     OR NEW.signal_key IS DISTINCT FROM OLD.signal_key
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'meetup_immutable_column'
      USING ERRCODE = '42501', DETAIL = 'only status can change';
  END IF;

  -- responded_at is server-owned: keep the old value unless set below
  NEW.responded_at := OLD.responded_at;

  -- cleanup issued by private.meetups_before_insert (nested trigger, depth > 1):
  -- an expired live row may only become cancelled
  IF pg_trigger_depth() > 1
     AND OLD.status IN ('pending', 'accepted')
     AND NEW.status = 'cancelled'
     AND OLD.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  IF now() >= OLD.expires_at THEN
    RAISE EXCEPTION 'meetup_expired' USING ERRCODE = '22023';
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined')
     AND private.is_my_participant(OLD.invitee) THEN
    NEW.responded_at := now();
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'cancelled'
     AND private.is_my_participant(OLD.inviter) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'accepted' AND NEW.status IN ('done', 'cancelled')
     AND (private.is_my_participant(OLD.inviter) OR private.is_my_participant(OLD.invitee)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'meetup_transition_not_allowed'
    USING ERRCODE = '42501',
          DETAIL = format('%s -> %s is not allowed for this participant', OLD.status, NEW.status);
END;
$$;

-- trigger functions are never called directly
REVOKE ALL ON FUNCTION private.meetups_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.meetups_before_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS meetups_before_insert ON public.meetups;
CREATE TRIGGER meetups_before_insert
BEFORE INSERT ON public.meetups
FOR EACH ROW EXECUTE FUNCTION private.meetups_before_insert();

DROP TRIGGER IF EXISTS meetups_before_update ON public.meetups;
CREATE TRIGGER meetups_before_update
BEFORE UPDATE ON public.meetups
FOR EACH ROW EXECUTE FUNCTION private.meetups_before_update();

-- 4) privileges + RLS (no DELETE) ---------------------------------------------
-- Supabase default privileges grant ALL on new public tables; start from nothing.
REVOKE ALL ON public.meetups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.meetups TO anon, authenticated;
GRANT ALL ON public.meetups TO service_role;

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetups member select" ON public.meetups;
DROP POLICY IF EXISTS "meetups member insert" ON public.meetups;
DROP POLICY IF EXISTS "meetups member update" ON public.meetups;

CREATE POLICY "meetups member select" ON public.meetups FOR SELECT TO anon, authenticated
USING (private.is_my_connection(connection_id));

CREATE POLICY "meetups member insert" ON public.meetups FOR INSERT TO anon, authenticated
WITH CHECK (private.is_my_connection(connection_id) AND private.is_my_participant(inviter));

CREATE POLICY "meetups member update" ON public.meetups FOR UPDATE TO anon, authenticated
USING (private.is_my_connection(connection_id))
WITH CHECK (private.is_my_connection(connection_id));

-- 5) realtime (added like the other tables; the app does not rely on it) -------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'meetups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetups;
  END IF;
END;
$$;

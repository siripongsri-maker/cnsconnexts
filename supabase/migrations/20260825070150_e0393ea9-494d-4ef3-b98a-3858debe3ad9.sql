-- 1) Device capability helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_device_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(current_setting('request.headers', true)::json ->> 'x-device-id', '')
$$;

-- ids of the participant rows owned by this caller (guest device or linked account)
CREATE OR REPLACE FUNCTION public.my_participant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.participants p
  WHERE (public.current_device_id() IS NOT NULL AND p.device_id = public.current_device_id())
     OR (auth.uid() IS NOT NULL AND p.linked_user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_my_participant(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _id IS NOT NULL AND EXISTS (SELECT 1 FROM public.my_participant_ids() m WHERE m = _id)
$$;

CREATE OR REPLACE FUNCTION public.is_my_connection(_connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.connections c
    WHERE c.id = _connection_id
      AND (c.user_a IN (SELECT public.my_participant_ids())
        OR c.user_b IN (SELECT public.my_participant_ids()))
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_device_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_participant_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_participant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_connection(uuid) TO anon, authenticated;

-- 2) submissions ownership column ----------------------------------------------
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS device_id text;

-- 3) participants ---------------------------------------------------------------
DROP POLICY IF EXISTS "event participants updatable" ON public.participants;
DROP POLICY IF EXISTS "event participants deletable" ON public.participants;

CREATE POLICY "participants owner update"
ON public.participants FOR UPDATE TO anon, authenticated
USING (public.is_my_participant(id))
WITH CHECK (public.is_my_participant(id));

CREATE POLICY "participants owner delete"
ON public.participants FOR DELETE TO anon, authenticated
USING (public.is_my_participant(id));

-- directory stays readable, but personal identifiers are not exposed
REVOKE SELECT ON public.participants FROM anon, authenticated;
GRANT SELECT (
  id, name, avatar, photo, province, region, organization, generation, bio,
  interests, powers_have, powers_need, source, linked_at, created_at, updated_at
) ON public.participants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.participants TO anon, authenticated;
GRANT ALL ON public.participants TO service_role;

-- 4) connections ----------------------------------------------------------------
DROP POLICY IF EXISTS "event connections readable" ON public.connections;
DROP POLICY IF EXISTS "event connections insertable" ON public.connections;
DROP POLICY IF EXISTS "event connections updatable" ON public.connections;
DROP POLICY IF EXISTS "event connections deletable" ON public.connections;

CREATE POLICY "connections member select"
ON public.connections FOR SELECT TO anon, authenticated
USING (public.is_my_participant(user_a) OR public.is_my_participant(user_b));

CREATE POLICY "connections member insert"
ON public.connections FOR INSERT TO anon, authenticated
WITH CHECK (public.is_my_participant(user_a) OR public.is_my_participant(user_b));

CREATE POLICY "connections member update"
ON public.connections FOR UPDATE TO anon, authenticated
USING (public.is_my_participant(user_a) OR public.is_my_participant(user_b))
WITH CHECK (public.is_my_participant(user_a) OR public.is_my_participant(user_b));

CREATE POLICY "connections member delete"
ON public.connections FOR DELETE TO anon, authenticated
USING (public.is_my_participant(user_a) OR public.is_my_participant(user_b));

-- 5) commitments ----------------------------------------------------------------
DROP POLICY IF EXISTS "event commitments readable" ON public.commitments;
DROP POLICY IF EXISTS "event commitments insertable" ON public.commitments;
DROP POLICY IF EXISTS "event commitments updatable" ON public.commitments;
DROP POLICY IF EXISTS "event commitments deletable" ON public.commitments;

CREATE POLICY "commitments member select"
ON public.commitments FOR SELECT TO anon, authenticated
USING (public.is_my_connection(connection_id));

CREATE POLICY "commitments member insert"
ON public.commitments FOR INSERT TO anon, authenticated
WITH CHECK (public.is_my_connection(connection_id));

CREATE POLICY "commitments member update"
ON public.commitments FOR UPDATE TO anon, authenticated
USING (public.is_my_connection(connection_id))
WITH CHECK (public.is_my_connection(connection_id));

CREATE POLICY "commitments member delete"
ON public.commitments FOR DELETE TO anon, authenticated
USING (public.is_my_connection(connection_id));

-- 6) messages -------------------------------------------------------------------
DROP POLICY IF EXISTS "event messages readable" ON public.messages;
DROP POLICY IF EXISTS "event messages insertable" ON public.messages;
DROP POLICY IF EXISTS "event messages deletable" ON public.messages;

CREATE POLICY "messages member select"
ON public.messages FOR SELECT TO anon, authenticated
USING (public.is_my_connection(connection_id));

CREATE POLICY "messages member insert"
ON public.messages FOR INSERT TO anon, authenticated
WITH CHECK (public.is_my_connection(connection_id) AND public.is_my_participant(from_id));

CREATE POLICY "messages member delete"
ON public.messages FOR DELETE TO anon, authenticated
USING (public.is_my_connection(connection_id));

-- 7) ideas ----------------------------------------------------------------------
DROP POLICY IF EXISTS "event ideas updatable" ON public.ideas;
DROP POLICY IF EXISTS "event ideas deletable" ON public.ideas;

CREATE POLICY "ideas owner update"
ON public.ideas FOR UPDATE TO anon, authenticated
USING (public.is_my_participant(owner_id))
WITH CHECK (public.is_my_participant(owner_id));

CREATE POLICY "ideas owner delete"
ON public.ideas FOR DELETE TO anon, authenticated
USING (public.is_my_participant(owner_id));

-- 8) province_notes -------------------------------------------------------------
DROP POLICY IF EXISTS "event province notes updatable" ON public.province_notes;
DROP POLICY IF EXISTS "event province notes deletable" ON public.province_notes;

CREATE POLICY "province notes author update"
ON public.province_notes FOR UPDATE TO anon, authenticated
USING (public.is_my_participant(author_id))
WITH CHECK (public.is_my_participant(author_id));

CREATE POLICY "province notes author delete"
ON public.province_notes FOR DELETE TO anon, authenticated
USING (public.is_my_participant(author_id));

-- 9) submissions ----------------------------------------------------------------
DROP POLICY IF EXISTS "event submissions updatable" ON public.submissions;
DROP POLICY IF EXISTS "event submissions deletable" ON public.submissions;
DROP POLICY IF EXISTS "event submissions insertable" ON public.submissions;

CREATE POLICY "submissions owner insert"
ON public.submissions FOR INSERT TO anon, authenticated
WITH CHECK (device_id IS NOT NULL AND device_id = public.current_device_id());

CREATE POLICY "submissions owner update"
ON public.submissions FOR UPDATE TO anon, authenticated
USING (device_id IS NOT NULL AND device_id = public.current_device_id())
WITH CHECK (device_id IS NOT NULL AND device_id = public.current_device_id());

CREATE POLICY "submissions owner delete"
ON public.submissions FOR DELETE TO anon, authenticated
USING (device_id IS NOT NULL AND device_id = public.current_device_id());

REVOKE SELECT ON public.submissions FROM anon, authenticated;
GRANT SELECT (
  id, name, course, batch, region, province, policy_issues, summary, highlight,
  wanted, photo, stage_ready, showcase, created_at, updated_at
) ON public.submissions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
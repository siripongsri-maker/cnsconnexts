CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_device_id()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT nullif(current_setting('request.headers', true)::json ->> 'x-device-id', '')
$$;

CREATE OR REPLACE FUNCTION private.my_participant_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id
  FROM public.participants p
  WHERE (private.current_device_id() IS NOT NULL AND p.device_id = private.current_device_id())
     OR (auth.uid() IS NOT NULL AND p.linked_user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.is_my_participant(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _id IS NOT NULL AND EXISTS (SELECT 1 FROM private.my_participant_ids() m WHERE m = _id)
$$;

CREATE OR REPLACE FUNCTION private.is_my_connection(_connection_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = _connection_id
      AND (c.user_a IN (SELECT private.my_participant_ids())
        OR c.user_b IN (SELECT private.my_participant_ids()))
  )
$$;

GRANT EXECUTE ON FUNCTION private.current_device_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.my_participant_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_my_participant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_my_connection(uuid) TO anon, authenticated;

-- repoint every policy at the private helpers
DROP POLICY IF EXISTS "participants owner update" ON public.participants;
DROP POLICY IF EXISTS "participants owner delete" ON public.participants;
CREATE POLICY "participants owner update" ON public.participants FOR UPDATE TO anon, authenticated
USING (private.is_my_participant(id)) WITH CHECK (private.is_my_participant(id));
CREATE POLICY "participants owner delete" ON public.participants FOR DELETE TO anon, authenticated
USING (private.is_my_participant(id));

DROP POLICY IF EXISTS "connections member select" ON public.connections;
DROP POLICY IF EXISTS "connections member insert" ON public.connections;
DROP POLICY IF EXISTS "connections member update" ON public.connections;
DROP POLICY IF EXISTS "connections member delete" ON public.connections;
CREATE POLICY "connections member select" ON public.connections FOR SELECT TO anon, authenticated
USING (private.is_my_participant(user_a) OR private.is_my_participant(user_b));
CREATE POLICY "connections member insert" ON public.connections FOR INSERT TO anon, authenticated
WITH CHECK (private.is_my_participant(user_a) OR private.is_my_participant(user_b));
CREATE POLICY "connections member update" ON public.connections FOR UPDATE TO anon, authenticated
USING (private.is_my_participant(user_a) OR private.is_my_participant(user_b))
WITH CHECK (private.is_my_participant(user_a) OR private.is_my_participant(user_b));
CREATE POLICY "connections member delete" ON public.connections FOR DELETE TO anon, authenticated
USING (private.is_my_participant(user_a) OR private.is_my_participant(user_b));

DROP POLICY IF EXISTS "commitments member select" ON public.commitments;
DROP POLICY IF EXISTS "commitments member insert" ON public.commitments;
DROP POLICY IF EXISTS "commitments member update" ON public.commitments;
DROP POLICY IF EXISTS "commitments member delete" ON public.commitments;
CREATE POLICY "commitments member select" ON public.commitments FOR SELECT TO anon, authenticated
USING (private.is_my_connection(connection_id));
CREATE POLICY "commitments member insert" ON public.commitments FOR INSERT TO anon, authenticated
WITH CHECK (private.is_my_connection(connection_id));
CREATE POLICY "commitments member update" ON public.commitments FOR UPDATE TO anon, authenticated
USING (private.is_my_connection(connection_id)) WITH CHECK (private.is_my_connection(connection_id));
CREATE POLICY "commitments member delete" ON public.commitments FOR DELETE TO anon, authenticated
USING (private.is_my_connection(connection_id));

DROP POLICY IF EXISTS "messages member select" ON public.messages;
DROP POLICY IF EXISTS "messages member insert" ON public.messages;
DROP POLICY IF EXISTS "messages member delete" ON public.messages;
CREATE POLICY "messages member select" ON public.messages FOR SELECT TO anon, authenticated
USING (private.is_my_connection(connection_id));
CREATE POLICY "messages member insert" ON public.messages FOR INSERT TO anon, authenticated
WITH CHECK (private.is_my_connection(connection_id) AND private.is_my_participant(from_id));
CREATE POLICY "messages member delete" ON public.messages FOR DELETE TO anon, authenticated
USING (private.is_my_connection(connection_id));

DROP POLICY IF EXISTS "ideas owner update" ON public.ideas;
DROP POLICY IF EXISTS "ideas owner delete" ON public.ideas;
CREATE POLICY "ideas owner update" ON public.ideas FOR UPDATE TO anon, authenticated
USING (private.is_my_participant(owner_id)) WITH CHECK (private.is_my_participant(owner_id));
CREATE POLICY "ideas owner delete" ON public.ideas FOR DELETE TO anon, authenticated
USING (private.is_my_participant(owner_id));

DROP POLICY IF EXISTS "province notes author update" ON public.province_notes;
DROP POLICY IF EXISTS "province notes author delete" ON public.province_notes;
CREATE POLICY "province notes author update" ON public.province_notes FOR UPDATE TO anon, authenticated
USING (private.is_my_participant(author_id)) WITH CHECK (private.is_my_participant(author_id));
CREATE POLICY "province notes author delete" ON public.province_notes FOR DELETE TO anon, authenticated
USING (private.is_my_participant(author_id));

DROP POLICY IF EXISTS "submissions owner insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions owner update" ON public.submissions;
DROP POLICY IF EXISTS "submissions owner delete" ON public.submissions;
CREATE POLICY "submissions owner insert" ON public.submissions FOR INSERT TO anon, authenticated
WITH CHECK (device_id IS NOT NULL AND device_id = private.current_device_id());
CREATE POLICY "submissions owner update" ON public.submissions FOR UPDATE TO anon, authenticated
USING (device_id IS NOT NULL AND device_id = private.current_device_id())
WITH CHECK (device_id IS NOT NULL AND device_id = private.current_device_id());
CREATE POLICY "submissions owner delete" ON public.submissions FOR DELETE TO anon, authenticated
USING (device_id IS NOT NULL AND device_id = private.current_device_id());

DROP FUNCTION IF EXISTS public.is_my_connection(uuid);
DROP FUNCTION IF EXISTS public.is_my_participant(uuid);
DROP FUNCTION IF EXISTS public.my_participant_ids();
DROP FUNCTION IF EXISTS public.current_device_id();
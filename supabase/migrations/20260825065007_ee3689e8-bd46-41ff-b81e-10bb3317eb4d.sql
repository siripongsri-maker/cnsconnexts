-- ============ participants ============
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '✨',
  photo TEXT,
  province TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'Nationwide',
  organization TEXT NOT NULL DEFAULT '',
  generation TEXT NOT NULL DEFAULT 'Millennial',
  bio TEXT NOT NULL DEFAULT '',
  interests TEXT[] NOT NULL DEFAULT '{}',
  powers_have TEXT[] NOT NULL DEFAULT '{}',
  powers_need TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'direct',
  linked_email TEXT,
  linked_user_id UUID,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO anon, authenticated;
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event participants readable" ON public.participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event participants insertable" ON public.participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event participants updatable" ON public.participants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "event participants deletable" ON public.participants FOR DELETE TO anon, authenticated USING (true);

-- ============ ideas ============
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  region TEXT NOT NULL DEFAULT 'Nationwide',
  issues TEXT[] NOT NULL DEFAULT '{}',
  resources_have TEXT[] NOT NULL DEFAULT '{}',
  resources_need TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas TO anon, authenticated;
GRANT ALL ON public.ideas TO service_role;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event ideas readable" ON public.ideas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event ideas insertable" ON public.ideas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event ideas updatable" ON public.ideas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "event ideas deletable" ON public.ideas FOR DELETE TO anon, authenticated USING (true);

-- ============ connections ============
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0,
  match_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX connections_pair_idx ON public.connections (LEAST(user_a::text, user_b::text), GREATEST(user_a::text, user_b::text));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO anon, authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event connections readable" ON public.connections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event connections insertable" ON public.connections FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event connections updatable" ON public.connections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "event connections deletable" ON public.connections FOR DELETE TO anon, authenticated USING (true);

-- ============ commitments ============
CREATE TABLE public.commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Planning',
  follow_up_date TIMESTAMPTZ,
  rsvp TEXT,
  partner_rsvp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO anon, authenticated;
GRANT ALL ON public.commitments TO service_role;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event commitments readable" ON public.commitments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event commitments insertable" ON public.commitments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event commitments updatable" ON public.commitments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "event commitments deletable" ON public.commitments FOR DELETE TO anon, authenticated USING (true);

-- ============ messages ============
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  from_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event messages readable" ON public.messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event messages insertable" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event messages deletable" ON public.messages FOR DELETE TO anon, authenticated USING (true);

-- ============ submissions ============
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course TEXT NOT NULL DEFAULT 'คนส.',
  batch TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'Nationwide',
  province TEXT NOT NULL DEFAULT '',
  policy_issues TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  highlight TEXT NOT NULL DEFAULT '',
  wanted TEXT NOT NULL DEFAULT '',
  photo TEXT,
  stage_ready BOOLEAN NOT NULL DEFAULT false,
  showcase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event submissions readable" ON public.submissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event submissions insertable" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event submissions updatable" ON public.submissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "event submissions deletable" ON public.submissions FOR DELETE TO anon, authenticated USING (true);

-- ============ province_notes ============
CREATE TABLE public.province_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province TEXT NOT NULL,
  author_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  issues TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.province_notes TO anon, authenticated;
GRANT ALL ON public.province_notes TO service_role;
ALTER TABLE public.province_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event province notes readable" ON public.province_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event province notes insertable" ON public.province_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event province notes updatable" ON public.province_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "event province notes deletable" ON public.province_notes FOR DELETE TO anon, authenticated USING (true);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commitments_updated_at BEFORE UPDATE ON public.commitments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_province_notes_updated_at BEFORE UPDATE ON public.province_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commitments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.province_notes;
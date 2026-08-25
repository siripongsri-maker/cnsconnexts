GRANT SELECT (id, name, avatar, photo, province, region, organization, generation, bio, interests, powers_have, powers_need, source, linked_at, created_at, updated_at), INSERT, UPDATE, DELETE ON public.participants TO anon, authenticated;
GRANT ALL ON public.participants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas TO anon, authenticated;
GRANT ALL ON public.ideas TO service_role;

GRANT SELECT (id, name, course, batch, region, province, policy_issues, summary, highlight, wanted, photo, stage_ready, showcase, created_at, updated_at), INSERT, UPDATE, DELETE ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.province_notes TO anon, authenticated;
GRANT ALL ON public.province_notes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO anon, authenticated;
GRANT ALL ON public.connections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO anon, authenticated;
GRANT ALL ON public.commitments TO service_role;

GRANT SELECT, INSERT, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
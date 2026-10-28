CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role text NOT NULL CHECK (role IN ('superadmin','owner','analyst','viewer')), UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.admin_google_grants (email text PRIMARY KEY, role text NOT NULL CHECK (role IN ('superadmin','owner','analyst','viewer')));
GRANT ALL ON public.admin_google_grants TO service_role;
ALTER TABLE public.admin_google_grants ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.admin_login_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account text NOT NULL, user_id uuid, method text NOT NULL CHECK(method IN ('google','password')), outcome text NOT NULL CHECK(outcome IN ('success','denied')), reason text NOT NULL DEFAULT '', session_key text UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.admin_login_history TO service_role;
ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_login_history_created_idx ON public.admin_login_history(created_at DESC);
CREATE FUNCTION public.claim_google_admin_role() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE account_email text; granted_role text;
BEGIN
 SELECT lower(u.email) INTO account_email FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='google' AND lower(i.identity_data->>'email')=lower(u.email));
 IF account_email IS NULL THEN RETURN NULL; END IF;
 SELECT role INTO granted_role FROM public.admin_google_grants WHERE email=account_email;
 IF granted_role IS NULL THEN RETURN NULL; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),granted_role) ON CONFLICT(user_id,role) DO NOTHING;
 RETURN granted_role;
END; $$;
REVOKE ALL ON FUNCTION public.claim_google_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_google_admin_role() TO authenticated,service_role;
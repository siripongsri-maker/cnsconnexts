GRANT SELECT (contact_name, contact_organization, contact_phone, contact_email, contact_url) ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
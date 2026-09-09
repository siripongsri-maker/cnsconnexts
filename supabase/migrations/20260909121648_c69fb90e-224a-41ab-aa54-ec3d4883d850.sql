CREATE TABLE IF NOT EXISTS public.backup_settings (
  id text PRIMARY KEY DEFAULT 'default',
  max_rows integer NOT NULL DEFAULT 2000,
  max_age_days integer NOT NULL DEFAULT 90,
  auto_prune boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.backup_settings TO service_role;

ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages backup settings" ON public.backup_settings;
CREATE POLICY "service role manages backup settings"
ON public.backup_settings FOR ALL TO service_role
USING (true) WITH CHECK (true);

INSERT INTO public.backup_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_backup_settings_updated_at ON public.backup_settings;
CREATE TRIGGER update_backup_settings_updated_at
BEFORE UPDATE ON public.backup_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.prune_data_backups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.backup_settings%ROWTYPE;
  removed integer := 0;
  n integer := 0;
BEGIN
  SELECT * INTO s FROM public.backup_settings WHERE id = 'default';
  IF NOT FOUND THEN RETURN 0; END IF;

  IF s.max_age_days > 0 THEN
    DELETE FROM public.data_backups
    WHERE created_at < now() - (s.max_age_days || ' days')::interval;
    GET DIAGNOSTICS n = ROW_COUNT;
    removed := removed + n;
  END IF;

  IF s.max_rows > 0 THEN
    DELETE FROM public.data_backups
    WHERE id IN (
      SELECT id FROM public.data_backups
      ORDER BY created_at DESC
      OFFSET s.max_rows
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    removed := removed + n;
  END IF;

  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_data_backups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_data_backups() TO service_role;
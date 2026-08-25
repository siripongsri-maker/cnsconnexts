CREATE TABLE public.data_backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL,
  row_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX data_backups_table_created_idx ON public.data_backups (table_name, created_at DESC);
CREATE INDEX data_backups_row_idx ON public.data_backups (row_id);

GRANT ALL ON public.data_backups TO service_role;

ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data backups service only"
ON public.data_backups FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_data_backup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_row_id := (to_jsonb(OLD) ->> 'id')::uuid;
    INSERT INTO public.data_backups (table_name, operation, row_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, v_row_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSE
    v_row_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.data_backups (table_name, operation, row_id, old_data, new_data)
    VALUES (
      TG_TABLE_NAME,
      TG_OP,
      v_row_id,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER backup_participants
AFTER INSERT OR UPDATE OR DELETE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.record_data_backup();

CREATE TRIGGER backup_ideas
AFTER INSERT OR UPDATE OR DELETE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.record_data_backup();

CREATE TRIGGER backup_submissions
AFTER INSERT OR UPDATE OR DELETE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.record_data_backup();

CREATE TRIGGER backup_province_notes
AFTER INSERT OR UPDATE OR DELETE ON public.province_notes
FOR EACH ROW EXECUTE FUNCTION public.record_data_backup();

CREATE TRIGGER backup_connections
AFTER INSERT OR UPDATE OR DELETE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.record_data_backup();

CREATE TRIGGER backup_commitments
AFTER INSERT OR UPDATE OR DELETE ON public.commitments
FOR EACH ROW EXECUTE FUNCTION public.record_data_backup();
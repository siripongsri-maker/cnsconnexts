ALTER TABLE public.data_backups
  ADD COLUMN IF NOT EXISTS actor text,
  ADD COLUMN IF NOT EXISTS actor_source text;

CREATE OR REPLACE FUNCTION public.record_data_backup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row_id uuid;
  v_actor text;
  v_source text;
  v_headers json;
BEGIN
  BEGIN
    v_actor := nullif(current_setting('request.jwt.claims', true)::json ->> 'email', '');
  EXCEPTION WHEN others THEN
    v_actor := NULL;
  END;
  IF v_actor IS NOT NULL THEN
    v_source := 'account';
  ELSE
    BEGIN
      v_headers := nullif(current_setting('request.headers', true), '')::json;
      v_actor := nullif(v_headers ->> 'x-device-id', '');
      IF v_actor IS NOT NULL THEN v_source := 'guest'; END IF;
    EXCEPTION WHEN others THEN
      v_actor := NULL;
    END;
  END IF;
  IF v_actor IS NULL THEN
    v_actor := current_user;
    v_source := CASE WHEN current_user = 'service_role' THEN 'admin' ELSE 'system' END;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    v_row_id := (to_jsonb(OLD) ->> 'id')::uuid;
    INSERT INTO public.data_backups (table_name, operation, row_id, old_data, new_data, actor, actor_source)
    VALUES (TG_TABLE_NAME, TG_OP, v_row_id, to_jsonb(OLD), NULL, v_actor, v_source);
    RETURN OLD;
  ELSE
    v_row_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.data_backups (table_name, operation, row_id, old_data, new_data, actor, actor_source)
    VALUES (
      TG_TABLE_NAME,
      TG_OP,
      v_row_id,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      v_actor,
      v_source
    );
    RETURN NEW;
  END IF;
END;
$function$;
-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.log_equipment_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_record JSONB;
  new_record JSONB;
  key TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Convert records to JSONB for comparison
  IF TG_OP = 'DELETE' THEN
    old_record := to_jsonb(OLD);
    
    INSERT INTO public.audit_logs (
      table_name, record_id, action, field_name, old_value, new_value, changed_at
    ) VALUES (
      TG_TABLE_NAME, OLD.id, TG_OP, 'entire_record', old_record::TEXT, NULL, now()
    );
    
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    new_record := to_jsonb(NEW);
    
    INSERT INTO public.audit_logs (
      table_name, record_id, action, field_name, old_value, new_value, changed_at
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, 'entire_record', NULL, new_record::TEXT, now()
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_record := to_jsonb(OLD);
    new_record := to_jsonb(NEW);
    
    -- Log each changed field separately
    FOR key IN SELECT jsonb_object_keys(new_record)
    LOOP
      -- Skip metadata fields
      IF key NOT IN ('id', 'created_at', 'updated_at') THEN
        old_val := COALESCE((old_record ->> key), '');
        new_val := COALESCE((new_record ->> key), '');
        
        -- Only log if values actually changed
        IF old_val != new_val THEN
          INSERT INTO public.audit_logs (
            table_name, record_id, action, field_name, old_value, new_value, changed_at
          ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP, key, old_val, new_val, now()
          );
        END IF;
      END IF;
    END LOOP;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;
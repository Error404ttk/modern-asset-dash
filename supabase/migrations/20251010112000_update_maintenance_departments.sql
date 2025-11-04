-- Add department references to maintenance and replacement tables
ALTER TABLE public.equipment_maintenance
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.equipment_replacements
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- Backfill department_id by matching existing department names
UPDATE public.equipment_maintenance em
SET department_id = d.id
FROM public.departments d
WHERE em.department_id IS NULL
  AND em.department IS NOT NULL
  AND trim(lower(em.department)) = trim(lower(d.name));

UPDATE public.equipment_replacements er
SET department_id = d.id
FROM public.departments d
WHERE er.department_id IS NULL
  AND er.department IS NOT NULL
  AND trim(lower(er.department)) = trim(lower(d.name));

-- Expand maintenance status constraint to support additional states
ALTER TABLE public.equipment_maintenance
  DROP CONSTRAINT IF EXISTS equipment_maintenance_status_check;

ALTER TABLE public.equipment_maintenance
  ADD CONSTRAINT equipment_maintenance_status_check
  CHECK (
    status IN (
      'planned',
      'in_progress',
      'completed',
      'not_worth_repair',
      'disposed',
      'pending_disposal'
    )
  );

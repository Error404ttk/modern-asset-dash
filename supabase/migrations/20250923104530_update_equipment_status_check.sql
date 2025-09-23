-- Allow additional equipment statuses for disposal and loss tracking
ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_status_check;

ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_status_check
  CHECK (status IN (
    'available',
    'borrowed',
    'maintenance',
    'damaged',
    'pending_disposal',
    'disposed',
    'lost'
  ));

-- Backfill existing records that may use deprecated status markers
UPDATE public.equipment
SET status = 'lost'
WHERE status = 'สูญหาย';

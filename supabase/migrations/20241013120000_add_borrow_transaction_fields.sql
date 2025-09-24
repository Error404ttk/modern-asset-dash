-- Add new metadata columns to borrow_transactions for enhanced tracking
ALTER TABLE public.borrow_transactions
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS return_condition text,
  ADD COLUMN IF NOT EXISTS return_receiver text,
  ADD COLUMN IF NOT EXISTS return_delay_days integer;

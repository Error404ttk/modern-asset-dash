-- Restore audit log visibility for management roles
BEGIN;

DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Privileged roles can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'technician'::app_role)
);

COMMIT;

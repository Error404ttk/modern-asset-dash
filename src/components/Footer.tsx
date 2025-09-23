import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

export const Footer = () => {
  const { settings } = useOrganizationSettings();
  const organizationName = settings?.name?.trim() || "ระบบจัดการครุภัณฑ์";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-card">
      <div className="container mx-auto flex flex-col gap-1 px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
        <p>© {currentYear} {organizationName}. สงวนลิขสิทธิ์.</p>
        <p>สร้างด้วย โดย IT Department</p>
      </div>
    </footer>
  );
};

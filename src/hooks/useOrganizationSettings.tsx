import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_TITLE = "ระบบครุภัณฑ์";
const DEFAULT_FAVICON = "/favicon.ico";

type OrganizationSettingsRow = Database["public"]["Tables"]["organization_settings"]["Row"];

type OrganizationSettingsContextValue = {
  settings: OrganizationSettingsRow | null;
  loading: boolean;
  refresh: () => Promise<OrganizationSettingsRow | null>;
  updateLocal: (updater: (prev: OrganizationSettingsRow | null) => OrganizationSettingsRow | null) => void;
};

const OrganizationSettingsContext = createContext<OrganizationSettingsContextValue | undefined>(undefined);

function applyBranding(settings: OrganizationSettingsRow | null) {
  const title = settings?.app_title?.trim() || settings?.name?.trim() || DEFAULT_TITLE;
  if (typeof document !== "undefined") {
    document.title = title;

    const targetHref = settings?.favicon_url?.trim() || DEFAULT_FAVICON;
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    if (link.getAttribute("href") !== targetHref) {
      link.setAttribute("href", targetHref);
    }
  }
}

export function OrganizationSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<OrganizationSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setSettings(data);
      applyBranding(data ?? null);
      return data ?? null;
    } catch (error) {
      console.error("Failed to load organization settings:", error);
      setSettings(null);
      applyBranding(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    applyBranding(settings);
  }, [settings]);

  const updateLocal = useCallback(
    (updater: (prev: OrganizationSettingsRow | null) => OrganizationSettingsRow | null) => {
      setSettings((prev) => {
        const next = updater(prev);
        applyBranding(next);
        return next;
      });
    },
    []
  );

  const value = useMemo<OrganizationSettingsContextValue>(() => ({
    settings,
    loading,
    refresh,
    updateLocal,
  }), [settings, loading, refresh, updateLocal]);

  return (
    <OrganizationSettingsContext.Provider value={value}>
      {children}
    </OrganizationSettingsContext.Provider>
  );
}

export function useOrganizationSettings() {
  const context = useContext(OrganizationSettingsContext);
  if (!context) {
    throw new Error("useOrganizationSettings must be used within an OrganizationSettingsProvider");
  }
  return context;
}

import { addMonths, differenceInCalendarDays, format, formatDistanceStrict, isValid, parseISO, startOfToday } from "date-fns";
import { th as thaiLocale } from "date-fns/locale";

import type { Tables } from "@/integrations/supabase/types";

export const IT_ROUND_TASKS = [
  { key: "power_check", label: "ตรวจเช็คระบบไฟ/UPS" },
  { key: "general_inspection", label: "ตรวจเช็คภาพรวม" },
  { key: "preventive_maintenance", label: "ซ่อมบำรุงเชิงป้องกัน" },
  { key: "dust_cleaning", label: "เป่าฝุ่น" },
  { key: "deep_cleaning", label: "ทำความสะอาด" },
  { key: "ups_battery_replacement", label: "เปลี่ยนแบตเตอรี่เครื่องสำรองไฟ" },
  { key: "virus_scan", label: "ตรวจ/ค้นหาไวรัส" },
  { key: "software_installation", label: "ติดตั้งโปรแกรม" },
  { key: "os_reinstallation", label: "ติดตั้งระบบปฏิบัติการใหม่" },
] as const;

export type ItRoundTaskKey = (typeof IT_ROUND_TASKS)[number]["key"];

export type ItRoundActivities = Record<ItRoundTaskKey, boolean>;

export const IT_ROUND_FREQUENCIES = [1, 3, 6, 12] as const;

export const IT_ROUND_FREQUENCY_LABELS: Record<number, string> = {
  1: "ทุก 1 เดือน",
  3: "ทุก 3 เดือน",
  6: "ทุก 6 เดือน",
  12: "ทุก 12 เดือน",
};

export const createEmptyItRoundActivities = (): ItRoundActivities =>
  IT_ROUND_TASKS.reduce((acc, task) => {
    acc[task.key] = false;
    return acc;
  }, {} as ItRoundActivities);

export const normalizeItRoundActivities = (
  value: Tables<"equipment_it_rounds">["activities"],
): ItRoundActivities => {
  const map = createEmptyItRoundActivities();

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    for (const task of IT_ROUND_TASKS) {
      map[task.key] = raw[task.key] === true;
    }
  }

  return map;
};

export const parseItRoundDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsedIso = parseISO(value);
  if (isValid(parsedIso)) {
    return parsedIso;
  }
  const parsedFallback = new Date(value);
  return isValid(parsedFallback) ? parsedFallback : null;
};

export type DerivedItRoundStatus = "overdue" | "dueSoon" | "onTrack";

export const evaluateItRoundStatus = (
  nextDue: Date | null,
): { status: DerivedItRoundStatus; daysUntilDue: number | null } => {
  if (!nextDue) {
    return { status: "onTrack", daysUntilDue: null };
  }
  const today = startOfToday();
  const diff = differenceInCalendarDays(nextDue, today);

  if (diff < 0) return { status: "overdue", daysUntilDue: diff };
  if (diff <= 30) return { status: "dueSoon", daysUntilDue: diff };
  return { status: "onTrack", daysUntilDue: diff };
};

export const formatItRoundDateDisplay = (value: string | null) => {
  const date = parseItRoundDate(value);
  if (!date) return "-";
  return format(date, "dd MMM yyyy", { locale: thaiLocale });
};

export const formatItRoundDueSummary = (days: number | null, dueDate: Date | null) => {
  if (days === null || !dueDate) {
    return "-";
  }
  if (days === 0) {
    return "ครบกำหนดวันนี้";
  }
  const distance = formatDistanceStrict(dueDate, startOfToday(), { locale: thaiLocale });
  if (days < 0) {
    return `เลยกำหนด ${distance}`;
  }
  return `อีก ${distance}`;
};

export const formatItRoundFrequency = (months: number) =>
  IT_ROUND_FREQUENCY_LABELS[months] ?? `${months} เดือน`;

export const isItRoundRelevantEquipment = (type: string | null | undefined) => {
  if (!type) return true;
  const lower = type.toLowerCase();
  return (
    lower.includes("คอม") ||
    lower.includes("computer") ||
    lower.includes("ups") ||
    lower.includes("สำรองไฟ")
  );
};

export const calculateNextDueDate = (performedAt: Date, frequencyMonths: number) =>
  addMonths(performedAt, frequencyMonths);

import {
  intervalToDuration,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

export type WarrantyStatus = "expired" | "expiringSoon" | "active";

export interface WarrantyStatusInfo {
  status: WarrantyStatus;
  label: string;
  detail?: string;
  /** Tailwind text color utility */
  textClass: string;
  /** Suitable for alert variants */
  tone: "destructive" | "warning" | "default" | "success";
  /** Human readable duration without prefixes */
  durationText: string;
}

const WARNING_THRESHOLD_DAYS = 60;

const formatDurationParts = (start: Date, end: Date): string => {
  const duration = intervalToDuration({ start, end });
  const parts: string[] = [];

  if (duration.years) {
    parts.push(`${duration.years} ปี`);
  }
  if (duration.months) {
    parts.push(`${duration.months} เดือน`);
  }
  if (duration.days && parts.length < 2) {
    parts.push(`${duration.days} วัน`);
  }

  if (parts.length === 0) {
    parts.push("0 วัน");
  }

  return parts.join(" ");
};

export const getWarrantyStatusInfo = (
  isoDate: string | null | undefined,
  options: { warningThresholdDays?: number } = {}
): WarrantyStatusInfo | null => {
  if (!isoDate) return null;

  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return null;

  const threshold = options.warningThresholdDays ?? WARNING_THRESHOLD_DAYS;
  const today = startOfDay(new Date());
  const target = startOfDay(parsed);
  const diffMillis = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMillis / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const detail = formatDurationParts(target, today);
    return {
      status: "expired",
      label: "ประกันหมด",
      detail: detail ? `หมดไปแล้ว ${detail}` : undefined,
      textClass: "text-destructive",
      tone: "destructive",
      durationText: detail,
    };
  }

  if (diffDays === 0) {
    return {
      status: "expiringSoon",
      label: "ประกันใกล้หมด",
      detail: "หมดภายในวันนี้",
      textClass: "text-warning",
      tone: "warning",
      durationText: "0 วัน",
    };
  }

  if (diffDays <= threshold) {
    const durationText = formatDurationParts(today, target);
    return {
      status: "expiringSoon",
      label: "ประกันใกล้หมด",
      detail: `เหลืออีก ${durationText}`,
      textClass: "text-warning",
      tone: "warning",
      durationText,
    };
  }

  const durationText = formatDurationParts(today, target);
  return {
    status: "active",
    label: "ประกัน",
    detail: `เหลืออีก ${durationText}`,
    textClass: "text-success",
    tone: "success",
    durationText,
  };
};

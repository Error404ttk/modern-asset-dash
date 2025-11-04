import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts";
import { Link } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import { th as thaiLocale } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  RefreshCw,
  PieChart as LucidePieChart,
  LineChart as LucideLineChart,
  BarChart3 as LucideBarChart3,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  History as HistoryIcon,
  Lock,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  IT_ROUND_FREQUENCIES,
  IT_ROUND_FREQUENCY_LABELS,
  IT_ROUND_TASKS,
  evaluateItRoundStatus,
  formatItRoundDateDisplay,
  formatItRoundDueSummary,
  formatItRoundFrequency,
  isItRoundRelevantEquipment,
  normalizeItRoundActivities,
  parseItRoundDate,
  createEmptyItRoundActivities,
  calculateNextDueDate,
  type DerivedItRoundStatus,
  type ItRoundActivities,
} from "@/lib/it-round";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type ActivityMap = ItRoundActivities;
type DerivedStatus = DerivedItRoundStatus;

type EquipmentSummary = {
  id: string;
  name: string | null;
  type: string | null;
  asset_number: string | null;
  location: string | null;
  assigned_to: string | null;
};

type SupabaseITRoundRow = Tables<"equipment_it_rounds"> & {
  equipment: EquipmentSummary | null;
};

type EnhancedITRound = SupabaseITRoundRow & {
  activitiesMap: ActivityMap;
  derivedStatus: DerivedStatus;
  daysUntilDue: number | null;
};

const DERIVED_STATUS_META: Record<
  DerivedStatus,
  { label: string; badgeClass: string; chipClass: string }
> = {
  overdue: {
    label: "เกินกำหนด",
    badgeClass: "bg-destructive text-destructive-foreground",
    chipClass: "border-destructive/50 bg-destructive/10 text-destructive",
  },
  dueSoon: {
    label: "ใกล้ถึงรอบ",
    badgeClass: "bg-warning text-warning-foreground",
    chipClass: "border-warning/50 bg-warning/10 text-warning",
  },
  onTrack: {
    label: "เรียบร้อย",
    badgeClass: "bg-success text-success-foreground",
    chipClass: "border-success/50 bg-success/10 text-success",
  },
};

const STATUS_CHART_CONFIG: ChartConfig = {
  overdue: {
    label: DERIVED_STATUS_META.overdue.label,
    color: "hsl(var(--destructive))",
  },
  dueSoon: {
    label: DERIVED_STATUS_META.dueSoon.label,
    color: "hsl(var(--warning))",
  },
  onTrack: {
    label: DERIVED_STATUS_META.onTrack.label,
    color: "hsl(var(--success))",
  },
};

const FREQUENCY_CHART_CONFIG: ChartConfig = {
  count: {
    label: "จำนวนรอบ",
    color: "hsl(var(--primary))",
  },
};

const COMPLETION_CHART_CONFIG: ChartConfig = {
  completed: {
    label: "จำนวนรอบที่ทำเสร็จ",
    color: "hsl(var(--primary))",
  },
};

type SensitiveAction = "edit" | "delete" | "history";

type AuditEntry = {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedByName: string;
  changedAt: string;
  reason: string | null;
};

type ItRoundDraft = {
  performed_at: string | null;
  next_due_at: string | null;
  frequency_months: number | null;
  technician: string | null;
  notes: string | null;
  status: string | null;
  activities: ItRoundActivities;
};

const FIELD_LABELS: Record<string, string> = {
  performed_at: "วันที่ดำเนินการ",
  next_due_at: "รอบถัดไป",
  frequency_months: "ความถี่รอบ",
  technician: "ผู้ดำเนินการ",
  notes: "หมายเหตุ",
  status: "สถานะ",
  "activities.power_check": "ตรวจเช็คระบบไฟ/UPS",
  "activities.general_inspection": "ตรวจเช็คภาพรวม",
  "activities.preventive_maintenance": "ซ่อมบำรุงเชิงป้องกัน",
  "activities.dust_cleaning": "เป่าฝุ่น",
  "activities.deep_cleaning": "ทำความสะอาด",
  "activities.ups_battery_replacement": "เปลี่ยนแบตเตอรี่เครื่องสำรองไฟ",
  "activities.virus_scan": "ตรวจ/ค้นหาไวรัส",
  "activities.software_installation": "ติดตั้งโปรแกรม",
  "activities.os_reinstallation": "ติดตั้งระบบปฏิบัติการใหม่",
  entire_record: "ข้อมูลทั้งหมด",
};

const formatAuditFieldLabel = (fieldName: string | null) => {
  if (!fieldName) return "ฟิลด์ที่ไม่ทราบชื่อ";
  return FIELD_LABELS[fieldName] ?? fieldName;
};

const formatAuditValue = (fieldName: string | null, value: string | null) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (fieldName === "performed_at" || fieldName === "next_due_at") {
    return formatItRoundDateDisplay(value);
  }

  if (fieldName === "frequency_months") {
    const months = Number(value);
    if (Number.isFinite(months)) {
      return formatItRoundFrequency(months);
    }
    return value;
  }

  if (fieldName?.startsWith("activities.")) {
    return value === "true" ? "ดำเนินการแล้ว" : "ไม่ได้ทำ";
  }

  if (fieldName === "entire_record") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }

  return value;
};

const formatHistoryTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return format(date, "dd MMM yyyy HH:mm:ss", { locale: thaiLocale });
};

const buildItRoundDraftFromRow = (round: EnhancedITRound | SupabaseITRoundRow): ItRoundDraft => ({
  performed_at: round.performed_at ?? null,
  next_due_at: round.next_due_at ?? null,
  frequency_months: round.frequency_months ?? null,
  technician: round.technician ?? null,
  notes: round.notes ?? null,
  status: round.status ?? null,
  activities: round.activities
    ? normalizeItRoundActivities(round.activities)
    : "activitiesMap" in round
      ? { ...round.activitiesMap }
      : createEmptyItRoundActivities(),
});

const buildItRoundDraftFromState = ({
  performedAt,
  nextDueAt,
  frequency,
  technician,
  notes,
  activities,
}: {
  performedAt: string;
  nextDueAt: string;
  frequency: number | null;
  technician: string;
  notes: string;
  activities: ItRoundActivities;
}): ItRoundDraft => ({
  performed_at: performedAt || null,
  next_due_at: nextDueAt || null,
  frequency_months: frequency,
  technician: technician.trim() || null,
  notes: notes.trim() || null,
  status: "completed",
  activities: { ...activities },
});

const computeItRoundChanges = (
  before: ItRoundDraft | null,
  after: ItRoundDraft | null,
): Array<{ field: string; oldValue: string | null; newValue: string | null }> => {
  if (!before && !after) return [];

  if (!before) {
    return [
      {
        field: "entire_record",
        oldValue: null,
        newValue: JSON.stringify(after),
      },
    ];
  }

  if (!after) {
    return [
      {
        field: "entire_record",
        oldValue: JSON.stringify(before),
        newValue: null,
      },
    ];
  }

  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
  const scalarFields: Array<keyof ItRoundDraft> = [
    "performed_at",
    "next_due_at",
    "frequency_months",
    "technician",
    "notes",
    "status",
  ];

  for (const key of scalarFields) {
    const oldValue = before[key];
    const newValue = after[key];
    if (oldValue === newValue) continue;
    if (oldValue === null && newValue === null) continue;
    changes.push({
      field: key,
      oldValue: oldValue === null ? null : String(oldValue),
      newValue: newValue === null ? null : String(newValue),
    });
  }

  for (const task of IT_ROUND_TASKS) {
    const oldValue = before.activities[task.key];
    const newValue = after.activities[task.key];
    if (oldValue !== newValue) {
      changes.push({
        field: `activities.${task.key}`,
        oldValue: oldValue ? "true" : "false",
        newValue: newValue ? "true" : "false",
      });
    }
  }

  return changes;
};

const toFrequencyDisplayValue = (value: number | null | undefined) =>
  value === null || value === undefined ? null : String(value);

const deriveTasksLabel = (map: ActivityMap) => {
  const activeTasks = IT_ROUND_TASKS.filter((task) => map[task.key]);
  if (activeTasks.length === 0) {
    return "ไม่ระบุ";
  }
  return activeTasks.map((task) => task.label).join(" • ");
};

const formatFrequencySafe = (months: number | null) =>
  typeof months === "number"
    ? formatItRoundFrequency(months)
    : "ไม่ระบุความถี่";

const FREQUENCY_FILTER_OPTIONS = [
  { value: "all", label: "ทุกความถี่" },
  { value: "1", label: IT_ROUND_FREQUENCY_LABELS[1] },
  { value: "3", label: IT_ROUND_FREQUENCY_LABELS[3] },
  { value: "6", label: IT_ROUND_FREQUENCY_LABELS[6] },
  { value: "12", label: IT_ROUND_FREQUENCY_LABELS[12] },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "overdue", label: DERIVED_STATUS_META.overdue.label },
  { value: "dueSoon", label: DERIVED_STATUS_META.dueSoon.label },
  { value: "onTrack", label: DERIVED_STATUS_META.onTrack.label },
] as const;

export default function ITRounds() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<EnhancedITRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTER_OPTIONS)[number]["value"]>("all");
  const [frequencyFilter, setFrequencyFilter] =
    useState<(typeof FREQUENCY_FILTER_OPTIONS)[number]["value"]>("all");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>("all");
  const [selectedRound, setSelectedRound] = useState<EnhancedITRound | null>(
    null,
  );
  const [sensitiveAction, setSensitiveAction] = useState<SensitiveAction | null>(
    null,
  );
  const [sensitiveDialogOpen, setSensitiveDialogOpen] = useState(false);
  const [sensitivePassword, setSensitivePassword] = useState("");
  const [sensitiveReason, setSensitiveReason] = useState("");
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<AuditEntry[]>([]);
  const [editPerformedAt, setEditPerformedAt] = useState("");
  const [editNextDueAt, setEditNextDueAt] = useState("");
  const [editFrequency, setEditFrequency] = useState<number | null>(null);
  const [editTechnician, setEditTechnician] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editActivities, setEditActivities] = useState<ItRoundActivities>(
    createEmptyItRoundActivities(),
  );
  const [editSaving, setEditSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nextDueAuto, setNextDueAuto] = useState(false);

  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment_it_rounds")
        .select(
          `
            *,
            equipment:equipment (
              id,
              name,
              type,
              asset_number,
              location,
              assigned_to
            )
          `,
        )
        .order("performed_at", { ascending: false });

      if (error) throw error;

      const typed = (data ?? []) as SupabaseITRoundRow[];
      const enhanced = typed.map((row) => {
        const activitiesMap = normalizeItRoundActivities(row.activities);
        const nextDueDate = parseItRoundDate(row.next_due_at);
        const { status, daysUntilDue } = evaluateItRoundStatus(nextDueDate);

        return {
          ...row,
          equipment: row.equipment,
          activitiesMap,
          derivedStatus: status,
          daysUntilDue,
        };
      });

      setRounds(enhanced);
    } catch (error: unknown) {
      console.error("Unable to load IT rounds", error);
      toast({
        title: "ไม่สามารถโหลดข้อมูล IT Round ได้",
        description: "กรุณาลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  const verifySensitivePassword = useCallback(
    async (password: string) => {
      if (!user?.email) {
        throw new Error("ไม่พบข้อมูลอีเมลของผู้ใช้งานปัจจุบัน");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }
    },
    [user],
  );

  const openSensitiveAction = useCallback(
    (round: EnhancedITRound, action: SensitiveAction) => {
      setSelectedRound(round);
      setSensitiveAction(action);
      setSensitiveDialogOpen(true);
      setSensitivePassword("");
      setSensitiveReason("");
      setActionReason("");
    },
    [],
  );

  const prepareEditForm = useCallback((round: EnhancedITRound) => {
    const performed = parseItRoundDate(round.performed_at);
    setEditPerformedAt(
      performed ? format(performed, "yyyy-MM-dd") : round.performed_at ?? "",
    );

    const nextDue = parseItRoundDate(round.next_due_at);
    setEditNextDueAt(
      nextDue ? format(nextDue, "yyyy-MM-dd") : round.next_due_at ?? "",
    );

    setEditFrequency(round.frequency_months ?? null);
    setEditTechnician(round.technician ?? "");
    setEditNotes(round.notes ?? "");
    setEditActivities({ ...round.activitiesMap });
    setNextDueAuto(false);
  }, []);

  useEffect(() => {
    if (!editDialogOpen) return;
    if (!nextDueAuto) return;
    if (!editPerformedAt || !editFrequency) return;

    const parsed = parseISO(editPerformedAt);
    if (!isValid(parsed)) {
      return;
    }

    const nextDue = calculateNextDueDate(parsed, editFrequency);
    setEditNextDueAt(format(nextDue, "yyyy-MM-dd"));
  }, [editDialogOpen, editFrequency, editPerformedAt, nextDueAuto]);

  const logItRoundChanges = useCallback(
    async ({
      roundId,
      action,
      reason,
      before,
      after,
    }: {
      roundId: string;
      action: "INSERT" | "UPDATE" | "DELETE";
      reason: string;
      before: ItRoundDraft | null;
      after: ItRoundDraft | null;
    }) => {
      const changeSet = computeItRoundChanges(before, after);
      if (changeSet.length === 0) {
        return;
      }

      const payload = changeSet.map((change) => ({
        table_name: "equipment_it_rounds",
        record_id: roundId,
        action,
        field_name: change.field,
        old_value: change.oldValue,
        new_value: change.newValue,
        changed_by: profile?.full_name ?? user?.email ?? user?.id ?? null,
        changed_by_user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        reason: reason.trim() || null,
      }));

      const { error } = await supabase.from("audit_logs").insert(payload);
      if (error) {
        throw error;
      }
    },
    [profile?.full_name, user?.email, user?.id],
  );

  const fetchAuditHistory = useCallback(
    async (roundId: string) => {
      try {
        setHistoryLoading(true);
        const { data, error } = await supabase
          .from("audit_logs")
          .select(
            "id, action, field_name, old_value, new_value, changed_by, changed_by_user_id, user_email, changed_at, reason",
          )
          .eq("table_name", "equipment_it_rounds")
          .eq("record_id", roundId)
          .order("changed_at", { ascending: false });
        if (error) throw error;

        const baseEntries: AuditEntry[] = (data ?? []).map((row) => ({
          id: row.id,
          action: row.action as AuditEntry["action"],
          fieldName: row.field_name,
          oldValue: row.old_value,
          newValue: row.new_value,
          changedBy: row.changed_by_user_id ?? row.changed_by ?? null,
          changedByName:
            row.changed_by ?? row.user_email ?? row.changed_by_user_id ?? "ไม่ทราบผู้ใช้",
          changedAt: row.changed_at,
          reason: row.reason,
        }));

        const userIds = Array.from(
          new Set(
            baseEntries
              .map((entry) => entry.changedBy)
              .filter((value): value is string => Boolean(value)),
          ),
        );

        let resolvedMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profileRows, error: profileError } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);
          if (profileError) throw profileError;

          resolvedMap = new Map(
            (profileRows ?? []).map((row) => [
              row.user_id,
              row.full_name || row.email || row.user_id,
            ]),
          );
        }

        const enriched = baseEntries.map((entry) => ({
          ...entry,
          changedByName:
            entry.changedBy && resolvedMap.has(entry.changedBy)
              ? resolvedMap.get(entry.changedBy)!
              : entry.changedByName,
        }));

        setHistoryEntries(enriched);
        setHistoryDialogOpen(true);
      } catch (error) {
        console.error("Failed to load IT round history", error);
        toast({
          title: "ไม่สามารถโหลดประวัติได้",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      } finally {
        setHistoryLoading(false);
      }
    },
    [toast],
  );

  const handleSensitiveSubmit = useCallback(async () => {
    const round = selectedRound;
    const action = sensitiveAction;

    if (!round || !action) {
      return;
    }

    if (action !== "history" && !sensitiveReason.trim()) {
      toast({
        title: "ต้องระบุเหตุผล",
        description: "กรุณาระบุเหตุผลประกอบการดำเนินการ",
        variant: "destructive",
      });
      return;
    }

    if (!sensitivePassword.trim()) {
      toast({
        title: "ต้องยืนยันรหัสผ่าน",
        description: "กรุณากรอกรหัสผ่านเพื่อยืนยันสิทธิ์",
        variant: "destructive",
      });
      return;
    }

    try {
      setSensitiveLoading(true);
      await verifySensitivePassword(sensitivePassword.trim());

      const trimmedReason =
        action === "history" ? "" : sensitiveReason.trim();

      setActionReason(trimmedReason);
      setSensitiveDialogOpen(false);
      setSensitivePassword("");
      setSensitiveReason("");
      setSensitiveAction(null);

      if (action === "edit") {
        prepareEditForm(round);
        setEditDialogOpen(true);
        return;
      }

      if (action === "delete") {
        setDeleteDialogOpen(true);
        return;
      }

      await fetchAuditHistory(round.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
      toast({
        title: "การยืนยันไม่สำเร็จ",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSensitiveLoading(false);
    }
  }, [
    fetchAuditHistory,
    prepareEditForm,
    selectedRound,
    sensitiveAction,
    sensitivePassword,
    sensitiveReason,
    toast,
    verifySensitivePassword,
  ]);

  const handleEditSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const round = selectedRound;
      if (!round) {
        toast({
          title: "ไม่พบข้อมูลที่จะแก้ไข",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        return;
      }

      if (!editPerformedAt) {
        toast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "กรุณาระบุวันที่ดำเนินการ",
          variant: "destructive",
        });
        return;
      }

      const performedDate = parseISO(editPerformedAt);
      if (!isValid(performedDate)) {
        toast({
          title: "วันที่ไม่ถูกต้อง",
          description: "กรุณาระบุวันที่ดำเนินการให้ถูกต้อง",
          variant: "destructive",
        });
        return;
      }

      if (
        !editFrequency ||
        !IT_ROUND_FREQUENCIES.some((item) => item === editFrequency)
      ) {
        toast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "กรุณาเลือกระยะเวลารอบ IT ที่ถูกต้อง",
          variant: "destructive",
        });
        return;
      }

      if (!editNextDueAt) {
        toast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "กรุณาระบุกำหนดรอบถัดไป",
          variant: "destructive",
        });
        return;
      }

      const afterDraft = buildItRoundDraftFromState({
        performedAt: editPerformedAt,
        nextDueAt: editNextDueAt,
        frequency: editFrequency,
        technician: editTechnician,
        notes: editNotes,
        activities: editActivities,
      });

      try {
        setEditSaving(true);
        const { error } = await supabase
          .from("equipment_it_rounds")
          .update({
            performed_at: afterDraft.performed_at,
            next_due_at: afterDraft.next_due_at,
            frequency_months: afterDraft.frequency_months,
            technician: afterDraft.technician,
            notes: afterDraft.notes,
            activities: afterDraft.activities,
          })
          .eq("id", round.id);

        if (error) throw error;

        try {
          await logItRoundChanges({
            roundId: round.id,
            action: "UPDATE",
            reason:
              actionReason.trim() || "ปรับปรุงข้อมูล IT Round",
            before: buildItRoundDraftFromRow(round),
            after: afterDraft,
          });
        } catch (auditError) {
          console.error("Failed to store audit log", auditError);
          toast({
            title: "บันทึกประวัติไม่สำเร็จ",
            description:
              "ข้อมูลได้รับการแก้ไขแล้ว แต่ไม่สามารถบันทึกประวัติได้ กรุณาแจ้งผู้ดูแลระบบ",
            variant: "destructive",
          });
        }

        toast({
          title: "อัปเดตข้อมูลสำเร็จ",
          description: "บันทึก IT Round ถูกแก้ไขเรียบร้อยแล้ว",
        });

        setEditDialogOpen(false);
        setSelectedRound(null);
        setActionReason("");
        await fetchRounds();
      } catch (error) {
        console.error("Failed to update IT round", error);
        toast({
          title: "อัปเดตไม่สำเร็จ",
          description: "ไม่สามารถแก้ไขข้อมูล IT Round ได้ กรุณาลองใหม่",
          variant: "destructive",
        });
      } finally {
        setEditSaving(false);
      }
    },
    [
      actionReason,
      editActivities,
      editFrequency,
      editNextDueAt,
      editNotes,
      editPerformedAt,
      editTechnician,
      fetchRounds,
      logItRoundChanges,
      selectedRound,
      toast,
    ],
  );

  const handleConfirmDelete = useCallback(async () => {
    const round = selectedRound;
    if (!round) {
      return;
    }

    const beforeDraft = buildItRoundDraftFromRow(round);

    try {
      setDeleteLoading(true);
      const { error } = await supabase
        .from("equipment_it_rounds")
        .delete()
        .eq("id", round.id);

      if (error) throw error;

      try {
        await logItRoundChanges({
          roundId: round.id,
          action: "DELETE",
          reason: actionReason.trim() || "ลบข้อมูล IT Round",
          before: beforeDraft,
          after: null,
        });
      } catch (auditError) {
        console.error("Failed to store audit log for deletion", auditError);
        toast({
          title: "บันทึกประวัติไม่สำเร็จ",
          description:
            "ข้อมูลถูกลบแล้ว แต่ไม่สามารถบันทึกประวัติได้ กรุณาแจ้งผู้ดูแลระบบ",
          variant: "destructive",
        });
      }

      toast({
        title: "ลบข้อมูลสำเร็จ",
        description: "รายการ IT Round ถูกลบออกจากระบบแล้ว",
      });

      setDeleteDialogOpen(false);
      setSelectedRound(null);
      setActionReason("");
      await fetchRounds();
    } catch (error) {
      console.error("Failed to delete IT round", error);
      toast({
        title: "ลบข้อมูลไม่สำเร็จ",
        description: "ไม่สามารถลบข้อมูล IT Round ได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  }, [actionReason, fetchRounds, logItRoundChanges, selectedRound, toast]);

  const equipmentTypes = useMemo(() => {
    const set = new Set<string>();
    rounds.forEach((round) => {
      const type = round.equipment?.type;
      if (type && isItRoundRelevantEquipment(type)) {
        set.add(type);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [rounds]);

  const filteredRounds = useMemo(() => {
    return rounds.filter((round) => {
      if (!isItRoundRelevantEquipment(round.equipment?.type)) {
        return false;
      }

      if (statusFilter !== "all" && round.derivedStatus !== statusFilter) {
        return false;
      }

      if (
        frequencyFilter !== "all" &&
        String(round.frequency_months) !== frequencyFilter
      ) {
        return false;
      }

      if (equipmentTypeFilter !== "all") {
        if (
          !round.equipment?.type ||
          round.equipment.type !== equipmentTypeFilter
        ) {
          return false;
        }
      }

      return true;
    });
  }, [rounds, statusFilter, frequencyFilter, equipmentTypeFilter]);

  const latestByEquipment = useMemo(() => {
    const map = new Map<string, EnhancedITRound>();

    for (const round of rounds) {
      if (!isItRoundRelevantEquipment(round.equipment?.type)) {
        continue;
      }

      const existing = map.get(round.equipment_id);
      if (!existing) {
        map.set(round.equipment_id, round);
        continue;
      }

      const existingPerformed = parseItRoundDate(existing.performed_at);
      const currentPerformed = parseItRoundDate(round.performed_at);

      if (
        existingPerformed &&
        currentPerformed &&
        currentPerformed > existingPerformed
      ) {
        map.set(round.equipment_id, round);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aDays = a.daysUntilDue ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysUntilDue ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });
  }, [rounds]);

  const editComparison = useMemo(() => {
    if (!selectedRound) {
      return null;
    }

    const beforeDraft = buildItRoundDraftFromRow(selectedRound);
    const afterDraft = buildItRoundDraftFromState({
      performedAt: editPerformedAt,
      nextDueAt: editNextDueAt,
      frequency: editFrequency,
      technician: editTechnician,
      notes: editNotes,
      activities: editActivities,
    });

    const differences = computeItRoundChanges(beforeDraft, afterDraft);
    const diffFields = new Set(differences.map((diff) => diff.field));

    const beforeTasks = IT_ROUND_TASKS.filter(
      (task) => beforeDraft.activities[task.key],
    ).map((task) => task.label);

    const afterTasks = IT_ROUND_TASKS.filter(
      (task) => afterDraft.activities[task.key],
    ).map((task) => task.label);

    return {
      beforeDraft,
      afterDraft,
      diffFields,
      beforeTasks,
      afterTasks,
    };
  }, [
    editActivities,
    editFrequency,
    editNextDueAt,
    editNotes,
    editPerformedAt,
    editTechnician,
    selectedRound,
  ]);

  const summaryStats = useMemo(() => {
    const totalRounds = filteredRounds.length;
    const overdueCount = filteredRounds.filter(
      (round) => round.derivedStatus === "overdue",
    ).length;
    const dueSoonCount = filteredRounds.filter(
      (round) => round.derivedStatus === "dueSoon",
    ).length;
    const onTrackCount = filteredRounds.filter(
      (round) => round.derivedStatus === "onTrack",
    ).length;
    const uniqueEquipment = new Set(
      filteredRounds.map((round) => round.equipment_id),
    ).size;

    return {
      totalRounds,
      overdueCount,
      dueSoonCount,
      onTrackCount,
      uniqueEquipment,
    };
  }, [filteredRounds]);

  const statusPieData = useMemo(() => {
    const counts: Record<DerivedStatus, number> = {
      overdue: 0,
      dueSoon: 0,
      onTrack: 0,
    };
    filteredRounds.forEach((round) => {
      counts[round.derivedStatus] += 1;
    });

    return (Object.keys(counts) as DerivedStatus[]).map((key) => ({
      key,
      label: DERIVED_STATUS_META[key].label,
      value: counts[key],
    }));
  }, [filteredRounds]);

  const frequencyBarData = useMemo(() => {
    return FREQUENCY_FILTER_OPTIONS.filter((item) => item.value !== "all").map(
      (item) => {
        const months = Number(item.value);
        const count = filteredRounds.filter(
          (round) => round.frequency_months === months,
        ).length;
        return {
          label: item.label,
          count,
        };
      },
    );
  }, [filteredRounds]);

  const completionLineData = useMemo(() => {
    const monthCounts = new Map<string, number>();

    filteredRounds.forEach((round) => {
      const performedAt = parseItRoundDate(round.performed_at);
      if (!performedAt) return;

      const key = format(performedAt, "yyyy-MM");
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    });

    const sortedKeys = Array.from(monthCounts.keys()).sort();
    const recentKeys = sortedKeys.slice(Math.max(sortedKeys.length - 8, 0));

    return recentKeys.map((key) => {
      const [year, month] = key.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return {
        month: format(date, "MMM yy", { locale: thaiLocale }),
        completed: monthCounts.get(key) ?? 0,
      };
    });
  }, [filteredRounds]);

  const topUpcoming = latestByEquipment.slice(0, 6);
  const highlightRound = topUpcoming[0] ?? null;

  const diffFields = editComparison?.diffFields ?? new Set<string>();
  const activitiesChanged = editComparison
    ? Array.from(editComparison.diffFields).some((field) =>
        field.startsWith("activities."),
      )
    : false;
  const beforeFrequencyValue = toFrequencyDisplayValue(
    editComparison?.beforeDraft.frequency_months,
  );
  const afterFrequencyValue = toFrequencyDisplayValue(
    editComparison?.afterDraft.frequency_months,
  );

  return (
    <div className="space-y-6">
      <Dialog
        open={sensitiveDialogOpen}
        onOpenChange={(open) => {
          setSensitiveDialogOpen(open);
          if (!open) {
            setSensitivePassword("");
            setSensitiveReason("");
            setSensitiveAction(null);
            setSensitiveLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการดำเนินการ</DialogTitle>
            <DialogDescription>
              {sensitiveAction === "edit"
                ? "กรุณายืนยันรหัสผ่านก่อนแก้ไขข้อมูล IT Round"
                : sensitiveAction === "delete"
                  ? "กรุณายืนยันรหัสผ่านก่อนลบข้อมูล IT Round"
                  : "กรุณายืนยันรหัสผ่านก่อนดูประวัติการแก้ไข"}
            </DialogDescription>
          </DialogHeader>
          {selectedRound && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div className="font-medium text-foreground">
                {selectedRound.equipment?.name ?? "ไม่ระบุครุภัณฑ์"}
              </div>
              <div className="text-xs text-muted-foreground">
                เลขครุภัณฑ์: {selectedRound.equipment?.asset_number ?? "-"}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  ดำเนินการเมื่อ{" "}
                  {formatItRoundDateDisplay(selectedRound.performed_at)}
                </div>
                <div>
                  รอบถัดไป{" "}
                  {formatItRoundDateDisplay(selectedRound.next_due_at)}
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm">
                รหัสผ่าน
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="current-password"
                value={sensitivePassword}
                onChange={(event) => setSensitivePassword(event.target.value)}
                placeholder="กรอกรหัสผ่านของคุณ"
                disabled={sensitiveLoading}
              />
            </div>
            {sensitiveAction !== "history" && (
              <div className="space-y-2">
                <Label htmlFor="confirm-reason" className="text-sm">
                  เหตุผลในการดำเนินการ
                </Label>
                <Textarea
                  id="confirm-reason"
                  rows={3}
                  value={sensitiveReason}
                  onChange={(event) => setSensitiveReason(event.target.value)}
                  placeholder="กรอกเหตุผลประกอบการแก้ไข/ลบข้อมูล"
                  disabled={sensitiveLoading}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSensitiveDialogOpen(false)}
              disabled={sensitiveLoading}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleSensitiveSubmit} disabled={sensitiveLoading}>
              {sensitiveLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังตรวจสอบ
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  ยืนยัน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setActionReason("");
            setSelectedRound(null);
            setNextDueAuto(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>แก้ไขบันทึก IT Round</DialogTitle>
            <DialogDescription>
              {selectedRound
                ? `ปรับปรุงข้อมูลสำหรับ ${selectedRound.equipment?.name ?? "ไม่ระบุครุภัณฑ์"}`
                : "ปรับปรุงข้อมูล IT Round"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleEditSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-performed-at">วันที่ดำเนินการ</Label>
                <Input
                  id="edit-performed-at"
                  type="date"
                  value={editPerformedAt}
                  onChange={(event) => {
                    setEditPerformedAt(event.target.value);
                    setNextDueAuto(true);
                  }}
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label>ความถี่ของรอบ</Label>
                <RadioGroup
                  value={editFrequency ? String(editFrequency) : ""}
                  onValueChange={(value) => {
                    setEditFrequency(Number(value));
                    setNextDueAuto(true);
                  }}
                  className="grid grid-cols-2 gap-2"
                  disabled={editSaving}
                >
                  {IT_ROUND_FREQUENCIES.map((months) => (
                    <Label
                      key={months}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm",
                        editFrequency === months &&
                          "border-primary bg-primary/10 text-primary",
                      )}
                    >
                      <RadioGroupItem value={String(months)} />
                      {formatItRoundFrequency(months)}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-next-due">กำหนดรอบถัดไป</Label>
                <Input
                  id="edit-next-due"
                  type="date"
                  value={editNextDueAt}
                  onChange={(event) => {
                    setEditNextDueAt(event.target.value);
                    setNextDueAuto(false);
                  }}
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-technician">ผู้ดำเนินการ</Label>
                <Input
                  id="edit-technician"
                  value={editTechnician}
                  onChange={(event) => setEditTechnician(event.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  disabled={editSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>กิจกรรมที่ดำเนินการ</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {IT_ROUND_TASKS.map((task) => (
                  <Label
                    key={task.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border border-muted bg-muted/30 p-3 text-sm",
                      editActivities[task.key] &&
                        "border-primary bg-primary/10 text-primary",
                    )}
                  >
                    <Checkbox
                      checked={editActivities[task.key]}
                      onCheckedChange={(checked) =>
                        setEditActivities((prev) => ({
                          ...prev,
                          [task.key]: Boolean(checked),
                        }))
                      }
                      disabled={editSaving}
                      className="mt-0.5"
                    />
                    <span>{task.label}</span>
                  </Label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">หมายเหตุ</Label>
              <Textarea
                id="edit-notes"
                rows={3}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="บันทึกรายละเอียดเพิ่มเติม"
                disabled={editSaving}
              />
            </div>

            <div className="rounded-lg border border-muted bg-muted/30 p-4">
              <div className="text-sm font-semibold text-foreground">
                เปรียบเทียบก่อน-หลังการแก้ไข
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-xs uppercase text-muted-foreground">
                    ข้อมูลเดิม
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("performed_at") &&
                        "border-warning/50 bg-warning/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      วันที่ดำเนินการ
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "performed_at",
                        editComparison?.beforeDraft.performed_at ?? null,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("next_due_at") &&
                        "border-warning/50 bg-warning/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      รอบถัดไป
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "next_due_at",
                        editComparison?.beforeDraft.next_due_at ?? null,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("frequency_months") &&
                        "border-warning/50 bg-warning/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      ความถี่
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "frequency_months",
                        beforeFrequencyValue,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("technician") &&
                        "border-warning/50 bg-warning/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      ผู้ดำเนินการ
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "technician",
                        editComparison?.beforeDraft.technician,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("notes") &&
                        "border-warning/50 bg-warning/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      หมายเหตุ
                    </div>
                    <div className="font-medium whitespace-pre-wrap">
                      {formatAuditValue(
                        "notes",
                        editComparison?.beforeDraft.notes,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      activitiesChanged && "border-warning/50 bg-warning/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      กิจกรรมที่ทำ
                    </div>
                    <div className="text-sm">
                      {editComparison && editComparison.beforeTasks.length > 0
                        ? editComparison.beforeTasks.join(" • ")
                        : "-"}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs uppercase text-muted-foreground">
                    ข้อมูลใหม่
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("performed_at") &&
                        "border-success/60 bg-success/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      วันที่ดำเนินการ
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "performed_at",
                        editComparison?.afterDraft.performed_at ?? null,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("next_due_at") &&
                        "border-success/60 bg-success/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      รอบถัดไป
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "next_due_at",
                        editComparison?.afterDraft.next_due_at ?? null,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("frequency_months") &&
                        "border-success/60 bg-success/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      ความถี่
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "frequency_months",
                        afterFrequencyValue,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("technician") &&
                        "border-success/60 bg-success/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      ผู้ดำเนินการ
                    </div>
                    <div className="font-medium">
                      {formatAuditValue(
                        "technician",
                        editComparison?.afterDraft.technician,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      diffFields.has("notes") &&
                        "border-success/60 bg-success/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      หมายเหตุ
                    </div>
                    <div className="font-medium whitespace-pre-wrap">
                      {formatAuditValue(
                        "notes",
                        editComparison?.afterDraft.notes,
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border bg-background p-3 text-sm shadow-sm",
                      activitiesChanged && "border-success/60 bg-success/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      กิจกรรมที่ทำ
                    </div>
                    <div className="text-sm">
                      {editComparison && editComparison.afterTasks.length > 0
                        ? editComparison.afterTasks.join(" • ")
                        : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-sm text-muted-foreground">
              เหตุผลในการแก้ไข:{" "}
              <span className="font-medium text-foreground">
                {actionReason || "-"}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={editSaving}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก
                  </>
                ) : (
                  "บันทึกการแก้ไข"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setActionReason("");
            setSelectedRound(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
            <DialogDescription>
              ข้อมูล IT Round จะถูกลบออกจากรายการ แต่ประวัติจะถูกเก็บรักษาไว้
            </DialogDescription>
          </DialogHeader>
          {selectedRound && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-semibold text-foreground">
                  {selectedRound.equipment?.name ?? "ไม่ระบุครุภัณฑ์"}
                </div>
                <div className="text-xs text-muted-foreground">
                  เลขครุภัณฑ์: {selectedRound.equipment?.asset_number ?? "-"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  ดำเนินการเมื่อ{" "}
                  {formatItRoundDateDisplay(selectedRound.performed_at)} โดย{" "}
                  {selectedRound.technician ?? "ไม่ระบุ"}
                </div>
              </div>
              <div className="rounded-md border border-dashed border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                เหตุผลในการลบ:{" "}
                <span className="font-semibold text-destructive">
                  {actionReason || "-"}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  ยืนยันการลบ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyDialogOpen}
        onOpenChange={(open) => {
          setHistoryDialogOpen(open);
          if (!open) {
            setHistoryEntries([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>ประวัติการแก้ไข IT Round</DialogTitle>
            <DialogDescription>
              {selectedRound
                ? `รายการสำหรับ ${selectedRound.equipment?.name ?? "ไม่ระบุครุภัณฑ์"}`
                : "ตรวจสอบประวัติการปรับปรุงข้อมูล"}
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              กำลังโหลดประวัติ...
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีประวัติการแก้ไขสำหรับรายการนี้
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {historyEntries.map((entry) => {
                const isDelete = entry.action === "DELETE";
                const isUpdate = entry.action === "UPDATE";
                const isInsert = entry.action === "INSERT";

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-md border p-3 text-sm shadow-sm",
                      isDelete && "border-destructive/40 bg-destructive/10",
                      isUpdate && "border-primary/40 bg-primary/5",
                      isInsert && "border-success/40 bg-success/10",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            isDelete && "border-destructive text-destructive",
                            isUpdate && "border-primary text-primary",
                            isInsert && "border-success text-success",
                          )}
                        >
                          {entry.action === "INSERT"
                            ? "สร้างใหม่"
                            : entry.action === "UPDATE"
                              ? "แก้ไข"
                              : "ลบ"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatHistoryTimestamp(entry.changedAt)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        โดย {entry.changedByName}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      ฟิลด์: {formatAuditFieldLabel(entry.fieldName)}
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div className="rounded border border-muted bg-background p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                          ค่าเดิม
                        </div>
                        <div className="text-xs whitespace-pre-wrap">
                          {formatAuditValue(entry.fieldName, entry.oldValue)}
                        </div>
                      </div>
                      <div className="rounded border border-muted bg-background p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                          ค่าปัจจุบัน
                        </div>
                        <div className="text-xs whitespace-pre-wrap">
                          {formatAuditValue(entry.fieldName, entry.newValue)}
                        </div>
                      </div>
                    </div>
                    {entry.reason && (
                      <div className="mt-2 rounded border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-xs text-muted-foreground">
                        เหตุผล:{" "}
                        <span className="font-medium text-foreground">
                          {entry.reason}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            บันทึก IT Round
          </h1>
          <p className="text-sm text-muted-foreground">
            ติดตามรอบการตรวจเช็ค ซ่อมบำรุง ทำความสะอาด
            และการจัดการซอฟต์แวร์สำหรับคอมพิวเตอร์และเครื่องสำรองไฟ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRounds}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            โหลดข้อมูลอีกครั้ง
          </Button>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="ความถี่" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_FILTER_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={equipmentTypeFilter}
              onValueChange={setEquipmentTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ประเภทครุภัณฑ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภทที่เกี่ยวข้อง</SelectItem>
                {equipmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {highlightRound && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-primary">
              <CalendarClock className="h-5 w-5" />
              รอบถัดไปที่ใกล้ถึงกำหนด
            </CardTitle>
            <CardDescription>
              ตรวจสอบอุปกรณ์ที่กำลังจะถึงรอบ IT Round เพื่อเตรียมการล่วงหน้า
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[2fr,1fr] md:items-center">
            <div>
              <div className="mb-1 text-sm text-muted-foreground">ครุภัณฑ์</div>
              <div className="text-lg font-semibold text-foreground">
                {highlightRound.equipment?.name ?? "ไม่ระบุชื่อ"}
              </div>
              <div className="text-sm text-muted-foreground">
                เลขครุภัณฑ์: {highlightRound.equipment?.asset_number ?? "-"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Badge
                  className={`${DERIVED_STATUS_META[highlightRound.derivedStatus].badgeClass}`}
                >
                  {DERIVED_STATUS_META[highlightRound.derivedStatus].label}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-primary"
                >
                  {formatFrequencySafe(highlightRound.frequency_months)}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-muted-foreground/40 text-muted-foreground"
                >
                  {highlightRound.equipment?.type ?? "ไม่ระบุประเภท"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 rounded-lg border border-primary/40 bg-background/80 p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">รอบถัดไป</div>
              <div className="text-lg font-semibold text-foreground">
                {formatItRoundDateDisplay(highlightRound.next_due_at)}
              </div>
              <div className="flex items-center gap-2 text-sm text-primary">
                <Clock className="h-4 w-4" />
                {formatItRoundDueSummary(
                  highlightRound.daysUntilDue,
                  parseItRoundDate(highlightRound.next_due_at),
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                งานที่ต้องทำ: {deriveTasksLabel(highlightRound.activitiesMap)}
              </div>
              <Button asChild variant="link" className="px-0 text-sm">
                <Link
                  to={`/equipment/${highlightRound.equipment_id}`}
                  className="inline-flex items-center gap-1"
                >
                  ดูรายละเอียดครุภัณฑ์
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              จำนวนบันทึกรวม
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-foreground">
              {summaryStats.totalRounds}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              บันทึก IT Round ตามตัวกรองปัจจุบัน
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              ครุภัณฑ์ที่ครอบคลุม
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-foreground">
              {summaryStats.uniqueEquipment}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              จำนวนเครื่องที่ผ่านการทำ IT Round
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              ใกล้ถึงรอบถัดไป
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-warning">
              {summaryStats.dueSoonCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ภายใน 30 วันจากนี้
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              ยังไม่ดำเนินการ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-destructive">
              {summaryStats.overdueCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              เลยกำหนดรอบถัดไปแล้ว
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LucidePieChart className="h-5 w-5 text-primary" />
              สัดส่วนสถานะ IT Round
            </CardTitle>
            <CardDescription>
              ดูภาพรวมสถานะของรอบทั้งหมดตามตัวกรอง
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusPieData.every((item) => item.value === 0) ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ
              </div>
            ) : (
              <ChartContainer config={STATUS_CHART_CONFIG}>
                <RechartsPieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {statusPieData.map((item) => (
                      <Cell key={item.key} fill={`var(--color-${item.key})`} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LucideLineChart className="h-5 w-5 text-primary" />
              แนวโน้มการทำ IT Round รายเดือน
            </CardTitle>
            <CardDescription>
              จำนวนรอบที่ดำเนินการในแต่ละเดือน (สูงสุด 8 เดือนล่าสุด)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completionLineData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ
              </div>
            ) : (
              <ChartContainer config={COMPLETION_CHART_CONFIG}>
                <RechartsLineChart data={completionLineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--color-completed)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </RechartsLineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LucideBarChart3 className="h-5 w-5 text-primary" />
              ความถี่ของ IT Round
            </CardTitle>
            <CardDescription>
              จำนวนครั้งที่ดำเนินการตามรอบ 1/3/6/12 เดือน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {frequencyBarData.every((item) => item.count === 0) ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ
              </div>
            ) : (
              <ChartContainer config={FREQUENCY_CHART_CONFIG}>
                <RechartsBarChart data={frequencyBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[6, 6, 0, 0]}
                  />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              รายการที่ใกล้ถึงรอบ
            </CardTitle>
            <CardDescription>
              อุปกรณ์ 6 รายการที่ควรจัดการเป็นลำดับแรก
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUpcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลที่เข้าเงื่อนไข
              </div>
            ) : (
              topUpcoming.map((round) => {
                const dueDate = parseItRoundDate(round.next_due_at);
                return (
                  <div
                    key={`${round.equipment_id}-${round.performed_at}`}
                    className="rounded-lg border border-border/60 bg-card/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {round.equipment?.name ?? "ไม่ระบุชื่อ"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          เลขครุภัณฑ์ {round.equipment?.asset_number ?? "-"}
                        </div>
                      </div>
                      <Badge
                        className={
                          DERIVED_STATUS_META[round.derivedStatus].badgeClass
                        }
                      >
                        {DERIVED_STATUS_META[round.derivedStatus].label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className="border-muted-foreground/40 text-muted-foreground"
                      >
                        {formatFrequencySafe(round.frequency_months)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-foreground",
                          DERIVED_STATUS_META[round.derivedStatus].chipClass,
                        )}
                      >
                        {formatItRoundDueSummary(round.daysUntilDue, dueDate)}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            บันทึกล่าสุด
          </CardTitle>
          <CardDescription>
            รายการ IT Round ล่าสุด 12 รายการ พร้อมรายละเอียดกิจกรรมที่ทำ
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredRounds.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-6 w-6 text-warning" />
              ไม่พบข้อมูล IT Round ตามตัวกรองที่เลือก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">ครุภัณฑ์</TableHead>
                    <TableHead className="min-w-[120px]">
                      วันที่ดำเนินการ
                    </TableHead>
                    <TableHead className="min-w-[120px]">รอบถัดไป</TableHead>
                    <TableHead className="min-w-[140px]">ความถี่</TableHead>
                    <TableHead>กิจกรรมที่ทำ</TableHead>
                    <TableHead className="min-w-[120px] text-right">
                      การจัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRounds.slice(0, 12).map((round) => {
                    const dueDate = parseItRoundDate(round.next_due_at);
                    const activities = IT_ROUND_TASKS.filter(
                      (task) => round.activitiesMap[task.key],
                    );

                    return (
                      <TableRow key={`${round.id}-${round.performed_at}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {round.equipment?.name ?? "ไม่ระบุชื่อ"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              เลขครุภัณฑ์ {round.equipment?.asset_number ?? "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {formatItRoundDateDisplay(round.performed_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            โดย {round.technician ?? "ไม่ระบุผู้ดำเนินการ"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {formatItRoundDateDisplay(round.next_due_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatItRoundDueSummary(
                              round.daysUntilDue,
                              dueDate,
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-muted-foreground/40 text-muted-foreground"
                          >
                            {formatFrequencySafe(round.frequency_months)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {activities.length === 0 ? (
                              <Badge
                                variant="outline"
                                className="border-dashed border-muted-foreground/40 text-muted-foreground"
                              >
                                ไม่ระบุ
                              </Badge>
                            ) : (
                              activities.map((task) => (
                                <Badge
                                  key={task.key}
                                  variant="outline"
                                  className="border-primary/40 bg-primary/5 text-primary"
                                >
                                  {task.label}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openSensitiveAction(round, "history")}
                            >
                              <HistoryIcon className="mr-1 h-4 w-4" />
                              ประวัติ
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openSensitiveAction(round, "edit")}
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              แก้ไข
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openSensitiveAction(round, "delete")}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              ลบ
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                to={`/equipment/${round.equipment_id}`}
                                className="inline-flex items-center gap-1"
                              >
                                ดูครุภัณฑ์
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

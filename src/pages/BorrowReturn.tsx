import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, ArrowLeftRight, Calendar, User, Monitor, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

const DEFAULT_DEPARTMENT_LABEL = "ไม่ระบุ";
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NEAR_DUE_THRESHOLD_DAYS = 3;

const formatThaiDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("th-TH");
};

const normalizeDate = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    return date;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const calculateDayDiff = (start: Date, end: Date) => {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NaN;
  }
  return Math.round((end.getTime() - start.getTime()) / DAY_IN_MS);
};

const diffFromToday = (target?: string | null) => {
  if (!target) return null;
  const today = normalizeDate(new Date());
  const rawTargetDate = new Date(target);
  if (Number.isNaN(rawTargetDate.getTime())) {
    return null;
  }
  const targetDate = normalizeDate(rawTargetDate);
  const diff = calculateDayDiff(today, targetDate);
  return Number.isNaN(diff) ? null : diff;
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

type BorrowNoteDetails = {
  purpose: string | null;
  notes: string | null;
};

const parseBorrowNoteDetails = (raw: string | null): BorrowNoteDetails => {
  if (!raw) {
    return { purpose: null, notes: null };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const typed = parsed as Record<string, unknown>;
      const rawPurpose = typeof typed.purpose === 'string' ? typed.purpose : null;
      const rawNotes = typeof typed.notes === 'string' ? typed.notes : null;
      const purpose = rawPurpose?.trim() ?? '';
      const notes = rawNotes?.trim() ?? '';

      return {
        purpose: purpose ? purpose : null,
        notes: notes ? notes : null,
      };
    }
  } catch {}

  const [firstLine = '', ...rest] = raw.split('\n');
  const trimmedFirst = firstLine.trim();
  const remaining = rest.join('\n').trim();

  if (rest.length > 0) {
    return {
      purpose: trimmedFirst ? trimmedFirst : null,
      notes: remaining ? remaining : null,
    };
  }

  return {
    purpose: null,
    notes: trimmedFirst ? trimmedFirst : null,
  };
};

const toDisplayText = (value?: string | null) => {
  if (!value) return '-';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '-';
};

type BorrowTransactionRecord = {
  recordId: string;
  equipmentId: string;
  id: string;
  name: string;
  serialNumber: string;
  borrower: string;
  department: string;
  borrowDateFormatted: string;
  borrowDateRaw: string | null;
  expectedReturnDateFormatted: string;
  expectedReturnDateRaw: string | null;
  status: string;
  returnDateFormatted: string;
  returnDateRaw: string | null;
  returnCondition: string | null;
  notes: string | null;
  borrowPurpose: string | null;
  borrowNotes: string | null;
  returnDelayDays: number | null;
};

const BorrowReturn = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const preselectedEquipmentId = (location.state as { equipmentId?: string } | null)?.equipmentId;
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<BorrowTransactionRecord[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Array<Pick<Tables<'equipment'>, 'id' | 'name' | 'asset_number'>>>([]);
  const [departments, setDepartments] = useState<Array<Tables<'departments'>>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | undefined>(preselectedEquipmentId);
  const [availableFetched, setAvailableFetched] = useState(false);
  const [borrowFormDates, setBorrowFormDates] = useState({ borrowDate: "", returnDate: "" });
  const [returnFormState, setReturnFormState] = useState({ recordId: "", returnDate: "" });
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const activeBorrowed = useMemo(
    () => transactions.filter((record) => record.status === 'borrowed'),
    [transactions]
  );

  const borrowDurationDays = useMemo(() => {
    if (!borrowFormDates.borrowDate || !borrowFormDates.returnDate) return null;
    const borrowDate = normalizeDate(new Date(borrowFormDates.borrowDate));
    const dueDate = normalizeDate(new Date(borrowFormDates.returnDate));
    const diff = calculateDayDiff(borrowDate, dueDate);
    return Number.isNaN(diff) ? null : diff;
  }, [borrowFormDates]);

  const borrowDurationMessage = useMemo(() => {
    if (borrowDurationDays === null) return null;
    if (borrowDurationDays < 0) {
      return {
        text: "วันที่กำหนดคืนต้องอยู่หลังวันที่ยืม",
        tone: "error" as const,
      };
    }

    if (borrowDurationDays === 0) {
      return {
        text: "กำหนดคืนภายในวันเดียวกัน",
        tone: "neutral" as const,
      };
    }

    return {
      text: `กำหนดคืนในอีก ${borrowDurationDays} วัน`,
      tone: "success" as const,
    };
  }, [borrowDurationDays]);

  const selectedReturnRecord = useMemo(
    () => transactions.find((record) => record.recordId === returnFormState.recordId),
    [transactions, returnFormState.recordId]
  );

  const returnOffsetDays = useMemo(() => {
    if (!selectedReturnRecord?.expectedReturnDateRaw || !returnFormState.returnDate) {
      return null;
    }

    const expectedDate = normalizeDate(new Date(selectedReturnRecord.expectedReturnDateRaw));
    const actualDate = normalizeDate(new Date(returnFormState.returnDate));
    const diff = calculateDayDiff(expectedDate, actualDate);
    return Number.isNaN(diff) ? null : diff;
  }, [selectedReturnRecord, returnFormState.returnDate]);

  const returnTimingMessage = useMemo(() => {
    if (returnOffsetDays === null) return null;

    if (returnOffsetDays === 0) {
      return {
        text: "คืนตรงตามกำหนด",
        tone: "onTime" as const,
      };
    }

    if (returnOffsetDays < 0) {
      return {
        text: `ส่งก่อนกำหนด ${Math.abs(returnOffsetDays)} วัน`,
        tone: "early" as const,
      };
    }

    return {
      text: `เกินกำหนด ${returnOffsetDays} วัน`,
      tone: "late" as const,
    };
  }, [returnOffsetDays]);

  const historyStats = useMemo(() => {
    const total = transactions.length;
    const returned = transactions.filter((record) => record.status === 'returned').length;
    const overdue = transactions.filter((record) => {
      if (typeof record.returnDelayDays === 'number') {
        return record.returnDelayDays > 0;
      }

      if (record.status === 'returned') {
        return false;
      }

      const days = diffFromToday(record.expectedReturnDateRaw);
      return typeof days === 'number' && days < 0;
    }).length;

    const damaged = transactions.filter((record) => record.returnCondition === 'damaged').length;
    const lost = transactions.filter((record) => record.returnCondition === 'lost').length;

    return { total, returned, overdue, damaged, lost };
  }, [transactions]);

  const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);

  const detailRecord = useMemo(
    () => (detailRecordId ? transactions.find((record) => record.recordId === detailRecordId) ?? null : null),
    [detailRecordId, transactions]
  );

  useEffect(() => {
    if (!returnFormState.recordId) {
      return;
    }

    const exists = activeBorrowed.some((record) => record.recordId === returnFormState.recordId);
    if (!exists) {
      setReturnFormState({ recordId: "", returnDate: "" });
    }
  }, [activeBorrowed, returnFormState.recordId]);

  // Fetch available equipment for borrowing
  const fetchAvailableEquipment = useCallback(async () => {
    try {
      // รีเฟรชรายการครุภัณฑ์สถานะพร้อมใช้งาน
      setAvailableFetched(false);
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, asset_number')
        .eq('status', 'available');

      if (error) throw error;

      setAvailableEquipment((data || []).map((e) => ({ id: e.id, name: e.name, asset_number: e.asset_number })));
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดรายการครุภัณฑ์ได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    } finally {
      setAvailableFetched(true);
    }
  }, [toast]);

  // Fetch all borrow transactions for current user
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          equipment:equipment_id (
            name,
            asset_number,
            serial_number
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedRecords: BorrowTransactionRecord[] = (data || []).map((record) => {
        const borrowDateRaw = record.borrowed_at ?? null;
        const expectedReturnRaw = record.expected_return_at ?? null;
        const returnDateRaw = record.returned_at ?? null;

        let computedReturnDelay: number | null = record.return_delay_days ?? null;
        if (computedReturnDelay === null && expectedReturnRaw && returnDateRaw) {
          computedReturnDelay = calculateDayDiff(
            normalizeDate(new Date(expectedReturnRaw)),
            normalizeDate(new Date(returnDateRaw))
          );
        }

        const noteDetails = parseBorrowNoteDetails(record.notes ?? null);

        return {
          recordId: record.id,
          equipmentId: record.equipment_id,
          id: record.equipment?.asset_number || record.equipment_id,
          name: record.equipment?.name || 'Unknown Equipment',
          serialNumber: record.equipment?.serial_number || 'N/A',
          borrower: record.borrower_name,
          department: record.department || DEFAULT_DEPARTMENT_LABEL,
          borrowDateFormatted: formatThaiDate(borrowDateRaw),
          borrowDateRaw,
          expectedReturnDateFormatted: formatThaiDate(expectedReturnRaw),
          expectedReturnDateRaw: expectedReturnRaw,
          status: record.status,
          returnDateFormatted: formatThaiDate(returnDateRaw),
          returnDateRaw,
          returnCondition: record.return_condition,
          notes: record.notes,
          borrowPurpose: noteDetails.purpose,
          borrowNotes: noteDetails.notes,
          returnDelayDays: computedReturnDelay,
        };
      });

      setTransactions(mappedRecords);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดรายการยืม-คืนได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setDepartments(data || []);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดหน่วยงานได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const activeDepartments = useMemo(
    () => departments.filter((department) => department.active),
    [departments]
  );

  useEffect(() => {
    if (user) {
      fetchAvailableEquipment();
      fetchTransactions();
      fetchDepartments();
    }
  }, [user, fetchAvailableEquipment, fetchTransactions, fetchDepartments]);

  useEffect(() => {
    if (!isDetailOpen || !detailRecordId) {
      return;
    }

    if (!detailRecord) {
      setIsDetailOpen(false);
      setDetailRecordId(null);
    }
  }, [isDetailOpen, detailRecordId, detailRecord]);

  useEffect(() => {
    if (!preselectedEquipmentId || !availableFetched) {
      return;
    }

    const match = availableEquipment.find((eq) => eq.id === preselectedEquipmentId);

    if (match) {
      setSelectedEquipmentId(match.id);
    } else {
      toast({
        title: "ไม่พบครุภัณฑ์ที่เลือก",
        description: "ครุภัณฑ์ที่เลือกอาจไม่พร้อมใช้งานแล้ว กรุณาเลือกครุภัณฑ์ที่พร้อมใช้งาน",
        variant: "destructive",
      });
      setSelectedEquipmentId(undefined);
    }

    navigate(location.pathname, { replace: true });
  }, [preselectedEquipmentId, availableFetched, availableEquipment, navigate, location.pathname, toast]);

  const handleBorrowSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const equipmentId = selectedEquipmentId || formData.get('equipment')?.toString();

    if (!equipmentId) {
      setIsSubmitting(false);
      toast({
        title: "กรุณาเลือกครุภัณฑ์",
        description: "ต้องเลือกครุภัณฑ์ที่อยู่ในสถานะพร้อมใช้งานก่อนบันทึกการยืม",
        variant: "destructive",
      });
      return;
    }

    const isStillAvailable = availableEquipment.some((item) => item.id === equipmentId);
    if (!isStillAvailable) {
      setIsSubmitting(false);
      toast({
        title: "ครุภัณฑ์ไม่พร้อมใช้งาน",
        description: "ครุภัณฑ์ที่เลือกไม่อยู่ในสถานะพร้อมใช้งานแล้ว กรุณาเลือกครุภัณฑ์อื่น",
        variant: "destructive",
      });
      fetchAvailableEquipment();
      return;
    }

    const borrowDateValue = formData.get('borrowDate')?.toString();
    const returnDateValue = formData.get('returnDate')?.toString();

    if (!borrowDateValue || !returnDateValue) {
      setIsSubmitting(false);
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุวันที่ยืมและวันที่กำหนดคืน",
        variant: "destructive",
      });
      return;
    }

    const borrowDateObj = new Date(borrowDateValue);
    const returnDateObj = new Date(returnDateValue);

    if (
      Number.isNaN(borrowDateObj.getTime()) ||
      Number.isNaN(returnDateObj.getTime()) ||
      returnDateObj < borrowDateObj
    ) {
      setIsSubmitting(false);
      toast({
        title: "วันที่ไม่ถูกต้อง",
        description: "วันที่กำหนดคืนต้องอยู่หลังหรือเท่ากับวันที่ยืม",
        variant: "destructive",
      });
      return;
    }

    const borrowerName = formData.get('borrower')?.toString() ?? '';
    const borrowerContact = formData.get('contact')?.toString() ?? null;
    const departmentName = formData.get('department')?.toString() ?? null;
    const purpose = formData.get('purpose')?.toString().trim() ?? '';
    const extraNotes = formData.get('notes')?.toString().trim() ?? '';
    const combinedNotes = [purpose, extraNotes].filter(Boolean).join('\n') || null;

    if (!user?.id) {
      setIsSubmitting(false);
      toast({
        title: 'ยังไม่ได้เข้าสู่ระบบ',
        description: 'กรุณาเข้าสู่ระบบก่อนบันทึกการยืม',
        variant: 'destructive',
      });
      return;
    }

    // เตรียม payload สำหรับเวอร์ชันสคีมาที่มีคอลัมน์ department และแบบสำรองหากไม่มีคอลัมน์นี้
    const borrowDataWithDept: TablesInsert<'borrow_transactions'> = {
      equipment_id: equipmentId,
      borrower_name: borrowerName,
      borrower_contact: borrowerContact,
      department: departmentName,
      borrowed_at: borrowDateObj.toISOString(),
      expected_return_at: returnDateObj.toISOString(),
      notes: combinedNotes,
      status: 'borrowed',
      user_id: user.id
    };

    const borrowDataNoDept: TablesInsert<'borrow_transactions'> = {
      equipment_id: equipmentId,
      borrower_name: borrowerName,
      borrower_contact: borrowerContact,
      borrowed_at: borrowDateObj.toISOString(),
      expected_return_at: returnDateObj.toISOString(),
      notes: combinedNotes,
      status: 'borrowed',
      user_id: user?.id || '00000000-0000-0000-0000-000000000000'
    };

    try {
      let compatibilityNotice: string | null = null;

      let { error: borrowError } = await supabase
        .from('borrow_transactions')
        .insert(borrowDataWithDept)
        .select('id');

      if (borrowError) {
        const missingDept =
          /column\s+"?department"?\s+does not exist/i.test(borrowError.message) ||
          /Could not find the 'department' column of 'borrow_transactions' in the schema cache/i.test(borrowError.message) ||
          (borrowError as PostgrestError).code === 'PGRST204';
        if (missingDept) {
          // ลองใหม่แบบไม่มี department (สคีมายังไม่รองรับ)
          let retry = await supabase
            .from('borrow_transactions')
            .insert(borrowDataNoDept)
            .select('id');
          if (retry.error) {
            // บางเวอร์ชันของ API คาดว่าจะได้ array
            retry = await supabase
              .from('borrow_transactions')
              .insert([borrowDataNoDept])
              .select('id');
          }
          if (retry.error) {
            throw retry.error;
          }
          compatibilityNotice = 'ระบบยังไม่รองรับคอลัมน์หน่วยงานในการบันทึกการยืม กรุณาให้นักพัฒนารัน migration ล่าสุดของ Supabase.';
        } else {
          // บางเวอร์ชันของ API คาดว่าจะได้ array
          const alt = await supabase
            .from('borrow_transactions')
            .insert([borrowDataWithDept])
            .select('id');
          if (alt.error) {
            throw borrowError;
          }
        }
      }

      const { error: updateError } = await supabase
        .from('equipment')
        .update({ 
          assigned_to: borrowerName,
          status: 'borrowed'
        })
        .eq('id', equipmentId);

      if (updateError) throw updateError;

      toast({
        title: "บันทึกสำเร็จ",
        description: compatibilityNotice
          ? `บันทึกการยืมครุภัณฑ์เรียบร้อยแล้ว\n${compatibilityNotice}`
          : "บันทึกการยืมครุภัณฑ์เรียบร้อยแล้ว",
      });

      formElement.reset();
      setSelectedEquipmentId(undefined);
      setBorrowFormDates({ borrowDate: "", returnDate: "" });
      fetchAvailableEquipment();
      fetchTransactions();
    } catch (error) {
      try {
        const errObj = error as PostgrestError | Error | unknown;
        if ((errObj as PostgrestError)?.message) {
          console.error('Borrow insert failed:', {
            message: (errObj as PostgrestError).message,
            details: (errObj as PostgrestError).details,
            hint: (errObj as PostgrestError).hint,
            code: (errObj as PostgrestError).code,
          });
        } else {
          console.error('Borrow insert failed (unknown):', errObj);
        }
      } catch {}
      const errObj = error as PostgrestError | Error | unknown;
      const extra = (errObj as PostgrestError)?.message
        ? `\nรายละเอียด: ${(errObj as PostgrestError).message}` +
          ((errObj as PostgrestError).details ? `\n${(errObj as PostgrestError).details}` : '') +
          ((errObj as PostgrestError).hint ? `\nHint: ${(errObj as PostgrestError).hint}` : '')
        : '';
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการยืมได้: " + getErrorMessage(error) + extra,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const borrowRecordId = formData.get('returnEquipment')?.toString();
    const condition = formData.get('condition')?.toString();
    const returnNotes = formData.get('returnNotes')?.toString().trim() ?? '';
    const returnDateValue = formData.get('returnDate')?.toString();
    const receiverValue = formData.get('receiver')?.toString().trim() ?? '';

    if (!borrowRecordId || !condition || !returnDateValue) {
      setIsSubmitting(false);
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกครุภัณฑ์ ระบุสภาพ และวันที่คืน",
        variant: "destructive",
      });
      return;
    }

    try {
      const borrowRecord = transactions.find((item) => item.recordId === borrowRecordId);
      if (!borrowRecord || !borrowRecord.equipmentId) {
        throw new Error('ไม่พบข้อมูลการยืม');
      }

      let finalNotes = returnNotes;
      if (condition === 'damaged' || condition === 'lost') {
        const damageInfo = `สถานะ: ${condition === 'damaged' ? 'ชำรุด' : 'สูญหาย'} | ผู้ยืม: ${borrowRecord.borrower} | วันที่คืน: ${new Date().toLocaleDateString('th-TH')}`;
        finalNotes = finalNotes ? `${damageInfo}\n${finalNotes}` : damageInfo;
      }

      let returnDelayDays: number | null = null;
      if (borrowRecord.expectedReturnDateRaw) {
        const diff = calculateDayDiff(
          normalizeDate(new Date(borrowRecord.expectedReturnDateRaw)),
          normalizeDate(new Date(returnDateValue))
        );
        returnDelayDays = Number.isNaN(diff) ? null : diff;
      }

      let compatibilityNotice: string | null = null;

      // ส่งเฉพาะฟิลด์ที่สคีมายอมรับแน่ๆ เพื่อหลีกเลี่ยง 400
      const minimalReturnPayload = {
        returned_at: new Date(returnDateValue).toISOString(),
        status: 'returned',
      } satisfies Record<string, unknown>;

      const { error: updateError } = await supabase
        .from('borrow_transactions')
        .update(minimalReturnPayload)
        .eq('id', borrowRecordId);

      if (updateError) {
        // หากยัง error ให้โยนออกเพื่อโชว์ข้อความจริง
        throw updateError;
      }

      let newStatus = 'available';
      let assignedTo: string | null = null;

      if (condition === 'damaged') {
        newStatus = 'damaged';
        assignedTo = `ชำรุดโดย: ${borrowRecord.borrower} (${new Date().toLocaleDateString('th-TH')})`;
      } else if (condition === 'lost') {
        newStatus = 'lost';
        assignedTo = `สูญหายโดย: ${borrowRecord.borrower} (${new Date().toLocaleDateString('th-TH')})`;
      }

      const { error: equipmentError } = await supabase
        .from('equipment')
        .update({ 
          assigned_to: assignedTo,
          status: newStatus
        })
        .eq('id', borrowRecord.equipmentId);

      if (equipmentError) throw equipmentError;

      toast({
        title: "บันทึกสำเร็จ",
        description: compatibilityNotice
          ? `บันทึกการคืนครุภัณฑ์เรียบร้อยแล้ว\n${compatibilityNotice}`
          : "บันทึกการคืนครุภัณฑ์เรียบร้อยแล้ว",
      });

      formElement.reset();
      setReturnFormState({ recordId: "", returnDate: "" });
      fetchAvailableEquipment();
      fetchTransactions();
    } catch (error) {
      try {
        const errObj = error as PostgrestError | Error | unknown;
        if ((errObj as PostgrestError)?.message) {
          console.error('Return update failed:', {
            message: (errObj as PostgrestError).message,
            details: (errObj as PostgrestError).details,
            hint: (errObj as PostgrestError).hint,
            code: (errObj as PostgrestError).code,
          });
        } else {
          console.error('Return update failed (unknown):', errObj);
        }
      } catch {}
      const errObj = error as PostgrestError | Error | unknown;
      const extra = (errObj as PostgrestError)?.message
        ? `\nรายละเอียด: ${(errObj as PostgrestError).message}` +
          ((errObj as PostgrestError).details ? `\n${(errObj as PostgrestError).details}` : '') +
          ((errObj as PostgrestError).hint ? `\nHint: ${(errObj as PostgrestError).hint}` : '')
        : '';
      toast({
        title: "เกิดข้อผิดพลาด", 
        description: "ไม่สามารถบันทึกการคืนได้: " + getErrorMessage(error) + extra,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (borrowRecordId: string) => {
    try {
      const borrowRecord = transactions.find((item) => item.recordId === borrowRecordId);
      if (!borrowRecord || !borrowRecord.equipmentId) {
        throw new Error('ไม่พบข้อมูลการยืม');
      }

      const nowIso = new Date().toISOString();
      let returnDelayDays: number | null = null;
      if (borrowRecord.expectedReturnDateRaw) {
        const diff = calculateDayDiff(
          normalizeDate(new Date(borrowRecord.expectedReturnDateRaw)),
          normalizeDate(new Date())
        );
        returnDelayDays = Number.isNaN(diff) ? null : diff;
      }

      let compatibilityNotice: string | null = null;

      const { error: updateError } = await supabase
        .from('borrow_transactions')
        .update({ 
          returned_at: nowIso,
          status: 'returned',
          return_condition: borrowRecord.returnCondition || 'normal',
          return_receiver: user?.email || null,
          return_delay_days: returnDelayDays,
        })
        .eq('id', borrowRecord.recordId);

      if (updateError) {
        const missingReturnColumns = /column\s+"?(return_condition|return_receiver|return_delay_days)"?/i.test(
          updateError.message
        );

        if (missingReturnColumns) {
          const fallbackPayload = {
            returned_at: nowIso,
            status: 'returned',
          } satisfies Record<string, unknown>;

          const { error: fallbackError } = await supabase
            .from('borrow_transactions')
            .update(fallbackPayload)
            .eq('id', borrowRecord.recordId);

          if (fallbackError) {
            throw fallbackError;
          }

          compatibilityNotice = 'ระบบยังไม่รองรับคอลัมน์เกี่ยวกับสภาพการคืน กรุณาให้นักพัฒนารัน migration ล่าสุดของ Supabase.';
        } else {
          throw updateError;
        }
      }

      const { error: equipmentError } = await supabase
        .from('equipment')
        .update({ 
          assigned_to: null,
          status: 'available'
        })
        .eq('id', borrowRecord.equipmentId);

      if (equipmentError) throw equipmentError;

      toast({
        title: "คืนครุภัณฑ์สำเร็จ", 
        description: compatibilityNotice
          ? `คืนครุภัณฑ์ ${borrowRecord.id} เรียบร้อยแล้ว\n${compatibilityNotice}`
          : `คืนครุภัณฑ์ ${borrowRecord.id} เรียบร้อยแล้ว`,
      });

      fetchTransactions();
      fetchAvailableEquipment();
    } catch (error) {
      try {
        const errObj = error as PostgrestError | Error | unknown;
        if ((errObj as PostgrestError)?.message) {
          console.error('Quick return failed:', {
            message: (errObj as PostgrestError).message,
            details: (errObj as PostgrestError).details,
            hint: (errObj as PostgrestError).hint,
            code: (errObj as PostgrestError).code,
          });
        } else {
          console.error('Quick return failed (unknown):', errObj);
        }
      } catch {}
      const errObj = error as PostgrestError | Error | unknown;
      const extra = (errObj as PostgrestError)?.message
        ? `\nรายละเอียด: ${(errObj as PostgrestError).message}` +
          ((errObj as PostgrestError).details ? `\n${(errObj as PostgrestError).details}` : '') +
          ((errObj as PostgrestError).hint ? `\nHint: ${(errObj as PostgrestError).hint}` : '')
        : '';
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคืนครุภัณฑ์ได้: " + getErrorMessage(error) + extra,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">การยืม-คืนครุภัณฑ์</h1>
          <p className="text-muted-foreground mt-2">จัดการการยืม-คืนครุภัณฑ์คอมพิวเตอร์</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          บันทึกการยืมใหม่
        </Button>
      </div>

      <Tabs defaultValue="borrow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="borrow">บันทึกการยืม</TabsTrigger>
          <TabsTrigger value="return">บันทึกการคืน</TabsTrigger>
          <TabsTrigger value="list">รายการยืม-คืน</TabsTrigger>
          <TabsTrigger value="history">ประวัติการยืม-คืน</TabsTrigger>
        </TabsList>

        {/* Borrow Tab */}
        <TabsContent value="borrow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftRight className="mr-2 h-5 w-5" />
                บันทึกการยืมครุภัณฑ์
              </CardTitle>
              <CardDescription>
                กรอกข้อมูลการยืมครุภัณฑ์ใหม่
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBorrowSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="equipment">ครุภัณฑ์</Label>
                    <div className="flex space-x-2">
                      <Select
                        name="equipment"
                        required
                        disabled={availableEquipment.length === 0}
                        value={selectedEquipmentId ?? undefined}
                        onValueChange={setSelectedEquipmentId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={availableEquipment.length ? "เลือกครุภัณฑ์" : "ยังไม่มีครุภัณฑ์พร้อมยืม"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEquipment.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              ไม่มีครุภัณฑ์สถานะพร้อมใช้งาน
                            </SelectItem>
                          ) : (
                            availableEquipment.map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name} ({eq.asset_number})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrower">ผู้ยืม</Label>
                    <Input name="borrower" placeholder="ชื่อ-นามสกุล ผู้ยืม" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">หน่วยงาน</Label>
                    <Select name="department" required disabled={activeDepartments.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder={activeDepartments.length ? "เลือกหน่วยงาน" : "ยังไม่มีหน่วยงาน"} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeDepartments.length === 0 ? (
                          <SelectItem value="none" disabled>
                            ยังไม่มีหน่วยงานที่เปิดใช้งาน
                          </SelectItem>
                        ) : (
                          activeDepartments.map((department) => (
                            <SelectItem key={department.id} value={department.name}>
                              {department.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">เบอร์ติดต่อ</Label>
                    <Input name="contact" placeholder="เบอร์โทรศัพท์" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrowDate">วันที่ยืม</Label>
                    <Input
                      id="borrowDate"
                      name="borrowDate"
                      type="date"
                      required
                      value={borrowFormDates.borrowDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBorrowFormDates((prev) => ({ ...prev, borrowDate: value }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnDate">วันที่กำหนดคืน</Label>
                    <Input
                      id="returnDate"
                      name="returnDate"
                      type="date"
                      required
                      min={borrowFormDates.borrowDate || undefined}
                      value={borrowFormDates.returnDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBorrowFormDates((prev) => ({ ...prev, returnDate: value }));
                      }}
                    />
                    {borrowDurationMessage && (
                      <p
                        className={`text-sm ${
                          borrowDurationMessage.tone === 'error'
                            ? 'text-red-500'
                            : 'text-green-600'
                        }`}
                      >
                        {borrowDurationMessage.text}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">วัตถุประสงค์การยืม</Label>
                  <Textarea name="purpose" placeholder="ระบุวัตถุประสงค์ในการยืมครุภัณฑ์" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Textarea name="notes" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting || availableEquipment.length === 0}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกการยืม'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Return Tab */}
        <TabsContent value="return">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftRight className="mr-2 h-5 w-5" />
                บันทึกการคืนครุภัณฑ์
              </CardTitle>
              <CardDescription>
                กรอกข้อมูลการคืนครุภัณฑ์
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReturnSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="returnEquipment">ครุภัณฑ์ที่คืน</Label>
                    <div className="flex space-x-2">
                      <Select
                        name="returnEquipment"
                        required
                        disabled={activeBorrowed.length === 0}
                        value={returnFormState.recordId}
                        onValueChange={(value) => {
                          const today = new Date().toISOString().split('T')[0];
                          setReturnFormState({ recordId: value, returnDate: today });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกครุภัณฑ์ที่ยืม" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeBorrowed.length === 0 ? (
                            <SelectItem value="none" disabled>
                              ไม่มีรายการยืมที่รอคืน
                            </SelectItem>
                          ) : (
                            activeBorrowed.map((item) => (
                              <SelectItem key={item.recordId} value={item.recordId}>
                                {item.name} ({item.id}) - ยืมโดย: {item.borrower}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnDate">วันที่คืน</Label>
                    <Input
                      id="returnDate"
                      name="returnDate"
                      type="date"
                      required
                      value={returnFormState.returnDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setReturnFormState((prev) => ({ ...prev, returnDate: value }));
                      }}
                    />
                    {returnTimingMessage && (
                      <p
                        className={`text-sm ${
                          returnTimingMessage.tone === 'onTime'
                            ? 'text-green-600'
                            : 'text-orange-500'
                        }`}
                      >
                        {returnTimingMessage.text}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">สภาพครุภัณฑ์</Label>
                    <Select name="condition" required>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสภาพครุภัณฑ์" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">ปกติ</SelectItem>
                        <SelectItem value="damaged">ชำรุด</SelectItem>
                        <SelectItem value="lost">สูญหาย</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiver">ผู้รับคืน</Label>
                    <Input name="receiver" placeholder="ชื่อ-นามสกุล ผู้รับคืน" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnNotes">หมายเหตุการคืน</Label>
                  <Textarea name="returnNotes" placeholder="หมายเหตุเกี่ยวกับสภาพครุภัณฑ์หรือข้อมูลเพิ่มเติม" />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกการคืน'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="mr-2 h-5 w-5" />
                รายการยืม-คืนครุภัณฑ์
              </CardTitle>
              <CardDescription>
                รายการครุภัณฑ์ที่อยู่ระหว่างการยืม
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาครุภัณฑ์, ผู้ยืม หรือหน่วยงาน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="borrowed">ยืมอยู่</SelectItem>
                    <SelectItem value="overdue">เกินกำหนด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>กำลังโหลดข้อมูล...</span>
                  </div>
                ) : activeBorrowed.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ไม่มีรายการยืม-คืน</p>
                ) : (
                  activeBorrowed
                    .filter(item => 
                      searchTerm === "" || 
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.borrower.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.department.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((item) => {
                      const daysUntilDue = diffFromToday(item.expectedReturnDateRaw);
                      let badgeText = 'ยืมอยู่';
                      let badgeClass = 'bg-primary text-primary-foreground';

                      if (typeof daysUntilDue === 'number') {
                        if (daysUntilDue < 0) {
                          badgeText = `เกินกำหนด ${Math.abs(daysUntilDue)} วัน`;
                          badgeClass = 'bg-red-500 text-white';
                        } else if (daysUntilDue === 0) {
                          badgeText = 'ครบกำหนดวันนี้';
                          badgeClass = 'bg-yellow-500 text-black';
                        } else if (daysUntilDue <= NEAR_DUE_THRESHOLD_DAYS) {
                          badgeText = `ใกล้ถึงกำหนดใน ${daysUntilDue} วัน`;
                          badgeClass = 'bg-yellow-400 text-black';
                        }
                      }

                      return (
                        <div key={item.recordId} className="border rounded-lg p-4 bg-card">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <Monitor className="h-5 w-5 text-muted-foreground" />
                                <div>
                                <h3 className="font-medium text-foreground">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">รหัส: {item.id} | S/N: {item.serialNumber}</p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">ผู้ยืม:</span>
                                <p className="font-medium">{item.borrower}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">หน่วยงาน:</span>
                                <p className="font-medium">{item.department}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">วันที่ยืม:</span>
                                <p className="font-medium">{item.borrowDateFormatted}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">กำหนดคืน:</span>
                                <p className="font-medium">{item.expectedReturnDateFormatted || '-'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge className={badgeClass}>
                              {badgeText}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDetailRecordId(item.recordId);
                                setIsDetailOpen(true);
                              }}
                            >
                              ดูรายละเอียด
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleReturn(item.recordId)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              บันทึกการคืน
                            </Button>
                          </div>
                        </div>
                      </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftRight className="mr-2 h-5 w-5" />
                ประวัติการยืม-คืน
              </CardTitle>
              <CardDescription>
                สถิติและข้อมูลการยืม-คืนล่าสุด
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                  <p className="text-2xl font-semibold">{historyStats.total}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">คืนแล้ว</p>
                  <p className="text-2xl font-semibold text-green-600">{historyStats.returned}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">เกินกำหนด</p>
                  <p className="text-2xl font-semibold text-red-500">{historyStats.overdue}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">ชำรุด / สูญหาย</p>
                  <p className="text-2xl font-semibold text-orange-500">
                    {historyStats.damaged + historyStats.lost}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">ครุภัณฑ์</th>
                      <th className="py-2 pr-4 font-medium">ผู้ยืม</th>
                      <th className="py-2 pr-4 font-medium">หน่วยงาน</th>
                      <th className="py-2 pr-4 font-medium">กำหนดคืน</th>
                      <th className="py-2 pr-4 font-medium">คืนจริง</th>
                      <th className="py-2 font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          ยังไม่มีประวัติการยืม-คืน
                        </td>
                      </tr>
                    ) : (
                      recentTransactions.map((record) => {
                        let statusText = record.status === 'returned' ? 'คืนแล้ว' : 'ยืมอยู่';
                        let statusColor = record.status === 'returned' ? 'text-green-600' : 'text-muted-foreground';

                        if (record.status === 'returned' && typeof record.returnDelayDays === 'number') {
                          if (record.returnDelayDays > 0) {
                            statusText = `คืนช้า ${record.returnDelayDays} วัน`;
                            statusColor = 'text-red-500';
                          } else if (record.returnDelayDays < 0) {
                            statusText = `คืนก่อนกำหนด ${Math.abs(record.returnDelayDays)} วัน`;
                            statusColor = 'text-orange-500';
                          }
                        }

                        if (record.status !== 'returned') {
                          const daysUntilDue = diffFromToday(record.expectedReturnDateRaw);
                          if (typeof daysUntilDue === 'number') {
                            if (daysUntilDue < 0) {
                              statusText = `เกินกำหนด ${Math.abs(daysUntilDue)} วัน`;
                              statusColor = 'text-red-500';
                            } else if (daysUntilDue === 0) {
                              statusText = 'ครบกำหนดวันนี้';
                              statusColor = 'text-orange-500';
                            } else if (daysUntilDue <= NEAR_DUE_THRESHOLD_DAYS) {
                              statusText = `ใกล้ครบกำหนดใน ${daysUntilDue} วัน`;
                              statusColor = 'text-orange-500';
                            }
                          }
                        }

                        if (record.returnCondition === 'damaged') {
                          statusText = `คืนแล้ว (ชำรุด)`;
                          statusColor = 'text-orange-500';
                        } else if (record.returnCondition === 'lost') {
                          statusText = `สูญหาย`; 
                          statusColor = 'text-red-500';
                        }

                        return (
                          <tr key={record.recordId} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">
                              {record.name}
                              <span className="block text-xs text-muted-foreground">
                                รหัส: {record.id}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              <span className="font-medium text-foreground">{record.borrower}</span>
                            </td>
                            <td className="py-2 pr-4">{record.department}</td>
                            <td className="py-2 pr-4">{record.expectedReturnDateFormatted || '-'}</td>
                            <td className="py-2 pr-4">{record.returnDateFormatted || '-'}</td>
                            <td className={`py-2 font-medium ${statusColor}`}>{statusText}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setDetailRecordId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดการยืม</DialogTitle>
            <DialogDescription>
              {detailRecord?.name ? `ข้อมูลเพิ่มเติมสำหรับ ${detailRecord.name}` : 'ข้อมูลการยืมเพิ่มเติม'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">วัตถุประสงค์การยืม</p>
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                {toDisplayText(detailRecord?.borrowPurpose ?? null)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">หมายเหตุ</p>
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                {toDisplayText(detailRecord?.borrowNotes ?? null)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BorrowReturn;

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Computer, AlertTriangle, CheckCircle, Clock, TrendingUp, Monitor, Printer, Server, Loader2, Building2, HardDrive, Cpu, Activity, Search, Maximize2, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { normalizeAssetNumber } from "@/lib/asset-number";

const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "available", label: "พร้อมใช้งาน" },
  { value: "borrowed", label: "ถูกยืม" },
  { value: "maintenance", label: "ซ่อมบำรุง" },
  { value: "damaged", label: "ชำรุด" },
  { value: "pending_disposal", label: "รอจำหน่าย" },
  { value: "disposed", label: "จำหน่าย" },
  { value: "lost", label: "สูญหาย" },
];

type ChartId =
  | "typeDistribution"
  | "departmentDistribution"
  | "brandDistribution"
  | "cpuDistribution"
  | "ramDistribution"
  | "osDistribution"
  | "yearDistribution"
  | "bookValueTrend"
  | "agingByDepartment"
  | "survivalCurve"
  | "depreciationByType";

const chartTitles: Record<ChartId, string> = {
  typeDistribution: "จำนวนครุภัณฑ์ตามประเภท",
  departmentDistribution: "จำนวนครุภัณฑ์ตามหน่วยงาน",
  brandDistribution: "ครุภัณฑ์ตามยี่ห้อ (Top 10)",
  cpuDistribution: "CPU ที่ใช้ (Top 8)",
  ramDistribution: "RAM ที่ใช้",
  osDistribution: "ระบบปฏิบัติการ",
  yearDistribution: "ครุภัณฑ์ตามปีที่ซื้อ",
  bookValueTrend: "มูลค่าตามบัญชี (Book Value) ตามปี",
  agingByDepartment: "ครุภัณฑ์ ≥ 5 ปี แยกตามหน่วยงาน",
  survivalCurve: "อัตราการคงอยู่ของครุภัณฑ์ (Survival Curve)",
  depreciationByType: "ค่าเสื่อมราคาครุภัณฑ์ตามประเภท",
};

const chartDimensions: Record<ChartId, { regular: number; expanded: number }> = {
  typeDistribution: { regular: 300, expanded: 420 },
  departmentDistribution: { regular: 300, expanded: 420 },
  brandDistribution: { regular: 300, expanded: 420 },
  cpuDistribution: { regular: 300, expanded: 420 },
  ramDistribution: { regular: 300, expanded: 420 },
  osDistribution: { regular: 300, expanded: 420 },
  yearDistribution: { regular: 300, expanded: 420 },
  bookValueTrend: { regular: 320, expanded: 460 },
  agingByDepartment: { regular: 320, expanded: 460 },
  survivalCurve: { regular: 320, expanded: 460 },
  depreciationByType: { regular: 320, expanded: 460 },
};

type NamedEntityInfo = {
  name: string;
  code: string;
};

type DepartmentInfo = NamedEntityInfo;

const DEFAULT_DEPARTMENT_NAME = "ไม่ระบุหน่วยงาน";
const DEFAULT_DEPARTMENT_CODE = "N/A";

const createNameCodeResolver = (
  entities: NamedEntityInfo[],
  fallbackName: string,
  fallbackCode: string,
) => {
  const normalized = entities
    .map((entity) => ({
      name: (entity.name ?? "").toString().trim(),
      code: (entity.code ?? "").toString().trim(),
    }))
    .filter((entity) => entity.name.length > 0 || entity.code.length > 0);

  const mapByName = new Map<string, NamedEntityInfo>();
  const mapByCode = new Map<string, NamedEntityInfo>();

  normalized.forEach((entity) => {
    if (entity.name.length > 0 && !mapByName.has(entity.name)) {
      mapByName.set(entity.name, entity);
    }
    if (entity.code.length > 0) {
      const codeKey = entity.code.toUpperCase();
      if (!mapByCode.has(codeKey)) {
        mapByCode.set(codeKey, entity);
      }
    }
  });

  return (rawValue: string) => {
    const cleaned = (rawValue ?? "").toString().trim();
    if (!cleaned || cleaned === fallbackName) {
      return { name: fallbackName, code: fallbackCode };
    }

    const exactName = mapByName.get(cleaned);
    if (exactName) {
      return exactName;
    }

    const cleanedUpper = cleaned.toUpperCase();
    const exactCode = mapByCode.get(cleanedUpper);
    if (exactCode) {
      return exactCode;
    }

    const partialMatch = normalized.find((entity) => {
      if (entity.code.length > 0 && cleanedUpper.includes(entity.code.toUpperCase())) {
        return true;
      }
      if (entity.name.length > 0 && cleaned.includes(entity.name)) {
        return true;
      }
      return false;
    });

    if (partialMatch) {
      return partialMatch;
    }

    return {
      name: cleaned || fallbackName,
      code: cleaned.length > 0 ? cleaned : fallbackCode,
    };
  };
};
export default function Dashboard() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    working: 0,
    broken: 0,
    maintenance: 0,
    expired: 0
  });
  const [recentEquipment, setRecentEquipment] = useState<any[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
  const [departmentDistribution, setDepartmentDistribution] = useState<any[]>([]);
  const [brandDistribution, setBrandDistribution] = useState<any[]>([]);
  const [cpuDistribution, setCpuDistribution] = useState<any[]>([]);
  const [ramDistribution, setRamDistribution] = useState<any[]>([]);
  const [osDistribution, setOsDistribution] = useState<any[]>([]);
  const [yearDistribution, setYearDistribution] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [bookValueTrend, setBookValueTrend] = useState<any[]>([]);
  const [agingByDepartment, setAgingByDepartment] = useState<any[]>([]);
  const [survivalCurve, setSurvivalCurve] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<{
    departments: string[];
    years: string[];
    matrix: Array<{
      department: string;
      values: Array<{ year: string; total: number; active: number; inactive: number }>;
    }>;
    maxCount: number;
  } | null>(null);
  const [depreciationByType, setDepreciationByType] = useState<any[]>([]);
  const [additionalStats, setAdditionalStats] = useState({
    avgAge: 0,
    warrantyExpiring: 0,
    totalValue: 0,
    utilizationRate: 85
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [ramFilter, setRamFilter] = useState("all");
  const [osFilter, setOsFilter] = useState("all");
  const [ramOptions, setRamOptions] = useState<string[]>([]);
  const [osOptions, setOsOptions] = useState<string[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentInfo[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreCharts, setShowMoreCharts] = useState(false);
  const [expandedChart, setExpandedChart] = useState<ChartId | null>(null);

  const roleLabels: Record<string, string> = {
    user: "ผู้ใช้งาน",
    admin: "ผู้ดูแลระบบ",
    super_admin: "ผู้ดูแลระบบสูงสุด",
  };

  const displayName = profile?.full_name?.trim().length
    ? profile.full_name
    : profile?.email?.split("@")[0] ?? "Admin";
  const roleLabel = profile ? roleLabels[profile.role] ?? "ผู้ใช้งาน" : "ผู้ดูแลระบบ";
  const greetingMessage = profile
    ? `ยินดีต้อนรับ, ${displayName} ${roleLabel}!`
    : "ยินดีต้อนรับสู่แดชบอร์ด!";

  const getSpecValueLocal = (specs: any, keys: string[]): string => {
    if (!specs) return "";
    for (const key of keys) {
      if (specs[key] !== undefined && specs[key] !== null) {
        const value = String(specs[key]).trim();
        if (value.length > 0 && value !== "__none__") return value;
      }
    }
    return "";
  };

  // Color palette for charts
  const COLORS = ['#2563eb', '#16a34a', '#f97316', '#a855f7', '#f43f5e', '#14b8a6', '#fb923c', '#38bdf8', '#facc15', '#94a3b8'];

  const departmentResolver = useMemo(
    () => createNameCodeResolver(departmentsList, DEFAULT_DEPARTMENT_NAME, DEFAULT_DEPARTMENT_CODE),
    [departmentsList],
  );

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const getSpecValue = (specs: any, keys: string[]): string => {
        if (!specs) return "";
        for (const key of keys) {
          if (specs[key] !== undefined && specs[key] !== null) {
            const value = String(specs[key]).trim();
            if (value.length > 0) {
              return value;
            }
          }
        }
        return "";
      };
      
      // Fetch all equipment for stats
      const { data: equipmentRows, error: equipmentError } = await (supabase as any)
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (equipmentError) throw equipmentError;

      const equipmentData = (equipmentRows || []).map((item: any) => {
        const assetInfo = normalizeAssetNumber(item.asset_number, item.quantity);
        return {
          ...item,
          asset_number: assetInfo.formatted,
          quantity: parseInt(assetInfo.sequence, 10) || 1,
          asset_sequence: assetInfo.sequence,
        };
      });

      // Fetch department metadata to map names with codes
      let departmentRecords: DepartmentInfo[] = [];
      const { data: departmentsData, error: departmentsError } = await (supabase as any)
        .from('departments')
        .select('name, code, active');

      if (departmentsError) {
        console.warn('Could not fetch departments metadata:', departmentsError);
      } else {
        departmentRecords = (departmentsData || [])
          .filter((dept: any) => dept.active !== false)
          .map((dept: any) => ({
            name: String(dept.name ?? '').trim(),
            code: String(dept.code ?? '').trim(),
          }))
          .filter((dept) => dept.name.length > 0 || dept.code.length > 0);
        setDepartmentsList(departmentRecords);
      }

      const localResolveDepartment = createNameCodeResolver(
        departmentRecords,
        DEFAULT_DEPARTMENT_NAME,
        DEFAULT_DEPARTMENT_CODE,
      );

      // Fetch recent activities
      const { data: activitiesData, error: activitiesError } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(10);

      if (activitiesError) console.warn('Could not fetch activities:', activitiesError);

      // Stash equipment list for filters & stats
      setAllEquipment(equipmentData || []);

      const uniqueTypes = Array.from(
        new Set((equipmentData || []).map((item: any) => item.type).filter(Boolean))
      )
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b));
      setTypeOptions(uniqueTypes);

      const uniqueDepartments = Array.from(
        new Set(
          (equipmentData || []).map((item: any) => {
            const dept = (item.specs?.department ?? "").toString().trim();
            return dept.length > 0 ? dept : "ไม่ระบุหน่วยงาน";
          })
        )
      )
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b));
      setDepartmentOptions(uniqueDepartments);

      const uniqueYears = Array.from(
        new Set(
          (equipmentData || [])
            .map((item: any) =>
              item.purchase_date ? new Date(item.purchase_date).getFullYear().toString() : null
            )
            .filter((year): year is string => year !== null)
        )
      )
        .map((value) => String(value))
        .sort((a, b) => parseInt(a) - parseInt(b));
      setYearOptions(uniqueYears);

      // Calculate unique RAM options
      const uniqueRam = Array.from(
        new Set(
          (equipmentData || [])
            .map((item: any) => {
              const ramRaw = getSpecValue(item.specs, ['ramGb', 'ram']);
              if (!ramRaw) return null;
              return /^[0-9]+(\.[0-9]+)?$/.test(ramRaw) ? `${ramRaw} GB` : ramRaw;
            })
            .filter((ram): ram is string => ram !== null && ram.length > 0)
        )
      )
        .map((value) => String(value))
        .sort((a, b) => {
          // Sort by numeric value if possible
          const aNum = parseFloat(a.replace(' GB', ''));
          const bNum = parseFloat(b.replace(' GB', ''));
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          return a.localeCompare(b);
        });
      setRamOptions(uniqueRam);

      // Calculate unique OS options
      const uniqueOs = Array.from(
        new Set(
          (equipmentData || [])
            .map((item: any) => getSpecValue(item.specs, ['operatingSystem', 'os']))
            .filter((os): os is string => os !== null && os.length > 0)
        )
      )
        .map((value) => String(value))
        .sort((a, b) => a.localeCompare(b));
      setOsOptions(uniqueOs);

      // Calculate basic stats
      const total = equipmentData?.length || 0;
      const working = equipmentData?.filter((e: any) => e.status === 'available').length || 0;
      const broken = equipmentData?.filter((e: any) => e.status === 'damaged').length || 0;
      const maintenance = equipmentData?.filter((e: any) => e.status === 'maintenance').length || 0;
      
      // Calculate expired warranties (next 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const expired = equipmentData?.filter((e: any) => {
        if (!e.warranty_end) return false;
        const warrantyDate = new Date(e.warranty_end);
        return warrantyDate <= threeMonthsFromNow;
      }).length || 0;

      setStats({ total, working, broken, maintenance, expired });

      // Set recent equipment (latest 4)
      const recent = equipmentData?.slice(0, 4).map((item: any) => ({
        id: item.asset_number,
        name: item.name,
        type: item.type,
        status: item.status,
        location: item.location || 'ไม่ระบุ'
      })) || [];
      setRecentEquipment(recent);

      // Calculate type distribution
      const typeCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        typeCount[item.type] = (typeCount[item.type] || 0) + 1;
      });

      const distribution = Object.entries(typeCount).map(([type, count]) => ({
        type,
        count: count as number,
        icon: getTypeIcon(type),
        color: getTypeColor(type),
        name: type,
        value: count as number
      }));

      setTypeDistribution(distribution);

      // Calculate department distribution based on responsible department field
      const deptCount: Record<string, { code: string; name: string; value: number }> = {};
      equipmentData?.forEach((item: any) => {
        const departmentRaw = (item.specs?.department ?? '').toString();
        const departmentMeta = localResolveDepartment(departmentRaw);
        const normalizedCode = departmentMeta.code?.trim().length
          ? departmentMeta.code.trim()
          : (departmentMeta.name?.trim() || DEFAULT_DEPARTMENT_CODE);
        const displayName = departmentMeta.name?.trim().length
          ? departmentMeta.name.trim()
          : DEFAULT_DEPARTMENT_NAME;

        if (!deptCount[normalizedCode]) {
          deptCount[normalizedCode] = {
            code: normalizedCode,
            name: displayName,
            value: 0,
          };
        }
        deptCount[normalizedCode].value += 1;
      });

      const deptDistribution = Object.values(deptCount)
        .sort((a, b) => b.value - a.value);

      setDepartmentDistribution(deptDistribution);

      // Calculate brand distribution (Top 10)
      const brandCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.brand) {
          brandCount[item.brand] = (brandCount[item.brand] || 0) + 1;
        }
      });

      const brandDistribution = Object.entries(brandCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setBrandDistribution(brandDistribution);

      // Calculate CPU distribution (Top 8)
      const cpuCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.specs?.cpu) {
          const cpu = item.specs.cpu;
          cpuCount[cpu] = (cpuCount[cpu] || 0) + 1;
        }
      });

      const cpuDistribution = Object.entries(cpuCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      setCpuDistribution(cpuDistribution);

      // Calculate RAM distribution
      const ramCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        const ramRaw = getSpecValue(item.specs, ['ramGb', 'ram']);
        if (!ramRaw) return;

        const normalized = /^[0-9]+(\.[0-9]+)?$/.test(ramRaw) ? `${ramRaw} GB` : ramRaw;
        ramCount[normalized] = (ramCount[normalized] || 0) + 1;
      });

      const ramDistribution = Object.entries(ramCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

      setRamDistribution(ramDistribution);

      // Calculate OS distribution
      const osCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        const osRaw = getSpecValue(item.specs, ['operatingSystem', 'os']);
        if (!osRaw) return;

        osCount[osRaw] = (osCount[osRaw] || 0) + 1;
      });

      const osDistribution = Object.entries(osCount)
        .map(([name, value]) => ({ name, value: value as number }));

      setOsDistribution(osDistribution);

      // Calculate year distribution
      const yearCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.purchase_date) {
          const year = new Date(item.purchase_date).getFullYear().toString();
          yearCount[year] = (yearCount[year] || 0) + 1;
        }
      });

      const yearDistribution = Object.entries(yearCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));

      setYearDistribution(yearDistribution);

      // Book value trend & aging analytics
      const bookValueByYear: Record<string, { total: number; aged: number }> = {};
      const agingDepartmentMap: Record<string, { count: number; value: number }> = {};
      const survivalBuckets: Record<number, { alive: number; total: number }> = {};
      const departmentYearCounts: Record<string, Record<string, { total: number; active: number; inactive: number }>> = {};
      const depreciationMap: Record<string, { depreciation: number; remaining: number; total: number }> = {};
      const today = new Date();
      const currentYear = today.getFullYear();
      const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
      const usefulLifeYears = 5;
      const activeStatuses = new Set(["available", "borrowed", "maintenance"]);

      const extractPrice = (rawPrice: any): number | null => {
        if (rawPrice === null || rawPrice === undefined) return null;
        const numeric = Number(String(rawPrice).replace(/[^0-9.]/g, ""));
        return Number.isFinite(numeric) ? numeric : null;
      };

      equipmentData?.forEach((item: any) => {
        const purchaseDate = item.purchase_date ? new Date(item.purchase_date) : null;
        const typeLabel = item.type || "ไม่ระบุ";
        const departmentName = (item.specs?.department ?? "").toString().trim() || "ไม่ระบุหน่วยงาน";
        const price = extractPrice(item.specs?.price) ?? 50000;

        let ageYears = 0;
        let purchaseYear: number | null = null;
        if (purchaseDate && !isNaN(purchaseDate.getTime())) {
          ageYears = (today.getTime() - purchaseDate.getTime()) / msPerYear;
          purchaseYear = purchaseDate.getFullYear();

          const depreciationPerYear = price / usefulLifeYears;
          for (let year = purchaseYear; year <= currentYear; year++) {
            const ageAtYear = Math.max(0, year - purchaseYear);
            const accumulated = Math.min(ageAtYear, usefulLifeYears) * depreciationPerYear;
            const remaining = Math.max(price - accumulated, 0);
            const key = year.toString();

            if (!bookValueByYear[key]) {
              bookValueByYear[key] = { total: 0, aged: 0 };
            }
            bookValueByYear[key].total += remaining;
            if (ageAtYear >= usefulLifeYears) {
              bookValueByYear[key].aged += remaining;
            }
          }

          if (!departmentYearCounts[departmentName]) {
            departmentYearCounts[departmentName] = {};
          }
          const yearKey = purchaseYear.toString();
          if (!departmentYearCounts[departmentName][yearKey]) {
            departmentYearCounts[departmentName][yearKey] = { total: 0, active: 0, inactive: 0 };
          }
          departmentYearCounts[departmentName][yearKey].total += 1;
          if (activeStatuses.has(item.status)) {
            departmentYearCounts[departmentName][yearKey].active += 1;
          } else {
            departmentYearCounts[departmentName][yearKey].inactive += 1;
          }
        }

        const depreciationPerYear = price / usefulLifeYears;
        const accumulatedCurrent = Math.min(Math.max(ageYears, 0), usefulLifeYears) * depreciationPerYear;
        const remainingCurrent = Math.max(price - accumulatedCurrent, 0);

        if (ageYears >= usefulLifeYears) {
          if (!agingDepartmentMap[departmentName]) {
            agingDepartmentMap[departmentName] = { count: 0, value: 0 };
          }
          agingDepartmentMap[departmentName].count += 1;
          agingDepartmentMap[departmentName].value += remainingCurrent;
        }

        const ageFloor = Math.max(0, Math.floor(ageYears));
        for (let age = 0; age <= ageFloor; age++) {
          if (!survivalBuckets[age]) {
            survivalBuckets[age] = { total: 0, alive: 0 };
          }
          survivalBuckets[age].total += 1;
          if (activeStatuses.has(item.status)) {
            survivalBuckets[age].alive += 1;
          }
        }

        if (!depreciationMap[typeLabel]) {
          depreciationMap[typeLabel] = { depreciation: 0, remaining: 0, total: 0 };
        }
        depreciationMap[typeLabel].depreciation += accumulatedCurrent;
        depreciationMap[typeLabel].remaining += remainingCurrent;
        depreciationMap[typeLabel].total += price;
      });

      const bookValueTrendData = Object.entries(bookValueByYear)
        .map(([year, values]) => ({
          year,
          totalValue: Number(values.total.toFixed(2)),
          agedValue: Number(values.aged.toFixed(2)),
        }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));
      setBookValueTrend(bookValueTrendData);

      const agingByDepartmentData = Object.entries(agingDepartmentMap)
        .map(([department, values]) => ({
          department,
          count: values.count,
          value: Number(values.value.toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      setAgingByDepartment(agingByDepartmentData);

      const survivalData = Object.entries(survivalBuckets)
        .map(([age, counts]) => ({
          age: Number(age),
          survivalRate: counts.total > 0 ? Number(((counts.alive / counts.total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => a.age - b.age);
      setSurvivalCurve(survivalData);

      const departmentTotals = Object.entries(departmentYearCounts).map(([department, yearMap]) => ({
        department,
        total: Object.values(yearMap).reduce((sum, entry) => sum + entry.total, 0),
      }));

      const topDepartments = departmentTotals
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
        .map((item) => item.department);

      const heatmapYears = Array.from(
        new Set(
          Object.values(departmentYearCounts).flatMap((yearMap) => Object.keys(yearMap))
        )
      )
        .map((value) => String(value))
        .sort((a, b) => parseInt(a) - parseInt(b));

      if (topDepartments.length > 0 && heatmapYears.length > 0) {
        let maxCount = 0;
        const matrix = topDepartments.map((department) => {
          const values = heatmapYears.map((year) => {
            const cell = departmentYearCounts[department]?.[year];
            const total = cell?.total ?? 0;
            const active = cell?.active ?? 0;
            const inactive = cell?.inactive ?? 0;
            maxCount = Math.max(maxCount, total);
            return { year, total, active, inactive };
          });
          return { department, values };
        });

        setHeatmapData({ departments: topDepartments, years: heatmapYears, matrix, maxCount });
      } else {
        setHeatmapData(null);
      }

      const depreciationData = Object.entries(depreciationMap)
        .map(([type, values]) => ({
          type,
          depreciation: Number(values.depreciation.toFixed(2)),
          remaining: Number(values.remaining.toFixed(2)),
          total: Number(values.total.toFixed(2)),
        }))
        .sort((a, b) => b.depreciation - a.depreciation);
      setDepreciationByType(depreciationData);

      // Format recent activities
      const activities = activitiesData?.map((item: any) => ({
        id: item.id,
        action: item.action,
        tableName: item.table_name,
        recordId: item.record_id,
        changedBy: item.changed_by || 'ระบบ',
        changedAt: new Date(item.changed_at).toLocaleString('th-TH'),
        description: getActivityDescription(item)
      })) || [];

      setRecentActivities(activities);

      // Calculate additional stats
      const ages = equipmentData
        ?.filter((item: any) => item.purchase_date)
        .map((item: any) => currentYear - new Date(item.purchase_date).getFullYear()) || [];
      
      const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

      setAdditionalStats({
        avgAge,
        warrantyExpiring: expired,
        totalValue: equipmentData?.length * 50000 || 0, // Estimated value
        utilizationRate: Math.round((working / total) * 100) || 0
      });

    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล Dashboard ได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityDescription = (activity: any) => {
    const actions = {
      'INSERT': 'เพิ่มข้อมูล',
      'UPDATE': 'แก้ไขข้อมูล',
      'DELETE': 'ลบข้อมูล'
    };
    
    const tables = {
      'equipment': 'ครุภัณฑ์',
      'profiles': 'ผู้ใช้',
      'departments': 'แผนก',
      'equipment_types': 'ประเภทครุภัณฑ์'
    };

    return `${actions[activity.action as keyof typeof actions] || activity.action} ${tables[activity.table_name as keyof typeof tables] || activity.table_name}`;
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('คอมพิวเตอร์') || lowerType.includes('desktop') || lowerType.includes('laptop')) return Computer;
    if (lowerType.includes('จอ') || lowerType.includes('monitor')) return Monitor;
    if (lowerType.includes('เครื่องพิมพ์') || lowerType.includes('printer')) return Printer;
    if (lowerType.includes('เซิร์ฟเวอร์') || lowerType.includes('server')) return Server;
    return Computer;
  };

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('คอมพิวเตอร์') || lowerType.includes('desktop')) return "bg-primary";
    if (lowerType.includes('laptop')) return "bg-accent";
    if (lowerType.includes('จอ') || lowerType.includes('monitor')) return "bg-warning";
    if (lowerType.includes('เครื่องพิมพ์') || lowerType.includes('printer')) return "bg-secondary";
    if (lowerType.includes('เซิร์ฟเวอร์') || lowerType.includes('server')) return "bg-muted-foreground";
    return "bg-primary";
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  const getStatusBadge = (status: string) => {
    const variants = {
      available: {
        variant: "default" as const,
        color: "bg-success text-success-foreground",
        label: "พร้อมใช้งาน"
      },
      borrowed: {
        variant: "secondary" as const,
        color: "bg-primary text-primary-foreground", 
        label: "ถูกยืม"
      },
      maintenance: {
        variant: "secondary" as const,
        color: "bg-warning text-warning-foreground",
        label: "ซ่อมบำรุง"
      },
      damaged: {
        variant: "destructive" as const,
        color: "bg-destructive text-destructive-foreground",
        label: "ชำรุด"
      },
      pending_disposal: {
        variant: "outline" as const,
        color: "bg-secondary text-secondary-foreground",
        label: "รอจำหน่าย"
      },
      disposed: {
        variant: "outline" as const,
        color: "bg-disposed text-disposed-foreground",
        label: "จำหน่าย"
      },
      lost: {
        variant: "destructive" as const,
        color: "bg-destructive text-destructive-foreground",
        label: "สูญหาย"
      }
    };
    const config = variants[status as keyof typeof variants] || {
      variant: "outline" as const,
      color: "bg-muted text-muted-foreground",
      label: status
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };
  const filteredEquipment = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allEquipment.filter((item: any) => {
      const departmentName = (item.specs?.department ?? "").toString().trim() || "ไม่ระบุหน่วยงาน";
      const purchaseYear = item.purchase_date
        ? new Date(item.purchase_date).getFullYear().toString()
        : null;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          item.asset_number,
          item.name,
          item.brand,
          item.model,
          item.location,
          item.assigned_to,
          departmentName,
        ]
          .filter(Boolean)
          .some((field: string) => field.toLowerCase().includes(normalizedSearch));

      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesDepartment = departmentFilter === "all" || departmentName === departmentFilter;
      const matchesYear = yearFilter === "all" || purchaseYear === yearFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      // RAM filter
      const ramValue = getSpecValueLocal(item.specs, ['ramGb', 'ram']);
      const normalizedRam = ramValue && /^[0-9]+(\.[0-9]+)?$/.test(ramValue) ? `${ramValue} GB` : ramValue;
      const matchesRam = ramFilter === "all" || normalizedRam === ramFilter;

      // OS filter
      const osValue = getSpecValueLocal(item.specs, ['operatingSystem', 'os']);
      const matchesOs = osFilter === "all" || osValue === osFilter;

      return matchesSearch && matchesType && matchesDepartment && matchesYear && matchesStatus && matchesRam && matchesOs;
    });
  }, [allEquipment, searchTerm, typeFilter, departmentFilter, yearFilter, statusFilter, ramFilter, osFilter]);

  // Stats computed from filtered equipment to reflect current filters
  const filteredStats = useMemo(() => {
    const total = filteredEquipment.length;
    const working = filteredEquipment.filter((e: any) => e.status === 'available').length;
    const broken = filteredEquipment.filter((e: any) => e.status === 'damaged').length;
    const maintenance = filteredEquipment.filter((e: any) => e.status === 'maintenance').length;
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const expired = filteredEquipment.filter((e: any) => {
      if (!e.warranty_end) return false;
      const warrantyDate = new Date(e.warranty_end);
      return warrantyDate <= threeMonthsFromNow;
    }).length;
    return { total, working, broken, maintenance, expired };
  }, [filteredEquipment]);

  const filteredAdditionalStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const ages = filteredEquipment
      .filter((item: any) => item.purchase_date)
      .map((item: any) => currentYear - new Date(item.purchase_date).getFullYear());
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const utilizationRate = filteredStats.total > 0 ? Math.round((filteredStats.working / filteredStats.total) * 100) : 0;
    const totalValue = filteredEquipment.length * 50000; // same heuristic as original
    return { avgAge, utilizationRate, totalValue };
  }, [filteredEquipment, filteredStats.total, filteredStats.working]);

  // Derived analytics based on filtered equipment so charts reflect filters
  const {
    typeDistributionFiltered,
    departmentDistributionFiltered,
    brandDistributionFiltered,
    cpuDistributionFiltered,
    ramDistributionFiltered,
    osDistributionFiltered,
    yearDistributionFiltered,
    bookValueTrendFiltered,
    agingByDepartmentFiltered,
    survivalCurveFiltered,
    heatmapDataFiltered,
    depreciationByTypeFiltered,
  } = useMemo(() => {
    const COLORS_LOCAL = COLORS;
    const result: any = {};

    const getSpecValueLocal = (specs: any, keys: string[]): string => {
      if (!specs) return "";
      for (const key of keys) {
        if (specs[key] !== undefined && specs[key] !== null) {
          const value = String(specs[key]).trim();
          if (value.length > 0 && value !== "__none__") return value;
        }
      }
      return "";
    };

    // Type distribution
    const typeCount: Record<string, number> = {};
    filteredEquipment.forEach((item: any) => {
      const t = item.type || "ไม่ระบุ";
      typeCount[t] = (typeCount[t] || 0) + 1;
    });
    result.typeDistributionFiltered = Object.entries(typeCount).map(([name, value]) => ({ name, value, type: name }));

    // Department distribution
    const deptCount: Record<string, { code: string; name: string; value: number }> = {};
    filteredEquipment.forEach((item: any) => {
      const departmentRaw = (item.specs?.department ?? '').toString();
      const departmentMeta = departmentResolver(departmentRaw);
      const normalizedCode = departmentMeta.code?.trim().length
        ? departmentMeta.code.trim()
        : (departmentMeta.name?.trim() || DEFAULT_DEPARTMENT_CODE);
      const displayName = departmentMeta.name?.trim().length
        ? departmentMeta.name.trim()
        : DEFAULT_DEPARTMENT_NAME;

      if (!deptCount[normalizedCode]) {
        deptCount[normalizedCode] = {
          code: normalizedCode,
          name: displayName,
          value: 0,
        };
      }
      deptCount[normalizedCode].value += 1;
    });
    result.departmentDistributionFiltered = Object.values(deptCount)
      .sort((a, b) => b.value - a.value);

    // Brand distribution (Top 10)
    const brandCount: Record<string, number> = {};
    filteredEquipment.forEach((item: any) => {
      if (item.brand) brandCount[item.brand] = (brandCount[item.brand] || 0) + 1;
    });
    result.brandDistributionFiltered = Object.entries(brandCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // CPU distribution (Top 8)
    const cpuCount: Record<string, number> = {};
    filteredEquipment.forEach((item: any) => {
      if (item.specs?.cpu) {
        const cpu = item.specs.cpu;
        cpuCount[cpu] = (cpuCount[cpu] || 0) + 1;
      }
    });
    result.cpuDistributionFiltered = Object.entries(cpuCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // RAM distribution
    const ramCount: Record<string, number> = {};
    filteredEquipment.forEach((item: any) => {
      const ramRaw = getSpecValueLocal(item.specs, ['ramGb', 'ram']);
      if (!ramRaw) return;
      const normalized = /^[0-9]+(\.[0-9]+)?$/.test(ramRaw) ? `${ramRaw} GB` : ramRaw;
      ramCount[normalized] = (ramCount[normalized] || 0) + 1;
    });
    result.ramDistributionFiltered = Object.entries(ramCount).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // OS distribution
    const osCount: Record<string, number> = {};
    filteredEquipment.forEach((item: any) => {
      const osRaw = getSpecValueLocal(item.specs, ['operatingSystem', 'os']);
      if (!osRaw) return;
      osCount[osRaw] = (osCount[osRaw] || 0) + 1;
    });
    result.osDistributionFiltered = Object.entries(osCount).map(([name, value]) => ({ name, value }));

    // Year distribution
    const yearCount: Record<string, number> = {};
    filteredEquipment.forEach((item: any) => {
      if (item.purchase_date) {
        const year = new Date(item.purchase_date).getFullYear().toString();
        yearCount[year] = (yearCount[year] || 0) + 1;
      }
    });
    result.yearDistributionFiltered = Object.entries(yearCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // Advanced analytics
    const bookValueByYear: Record<string, { total: number; aged: number }> = {};
    const agingDepartmentMap: Record<string, { count: number; value: number }> = {};
    const survivalBuckets: Record<number, { alive: number; total: number }> = {};
    const departmentYearCounts: Record<string, Record<string, { total: number; active: number; inactive: number }>> = {};
    const depreciationMap: Record<string, { depreciation: number; remaining: number; total: number }> = {};
    const today = new Date();
    const currentYear = today.getFullYear();
    const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
    const usefulLifeYears = 5;
    const activeStatuses = new Set(["available", "borrowed", "maintenance"]);

    const extractPrice = (rawPrice: any): number | null => {
      if (rawPrice === null || rawPrice === undefined) return null;
      const numeric = Number(String(rawPrice).replace(/[^0-9.]/g, ""));
      return Number.isFinite(numeric) ? numeric : null;
    };

    filteredEquipment.forEach((item: any) => {
      const purchaseDate = item.purchase_date ? new Date(item.purchase_date) : null;
      const typeLabel = item.type || "ไม่ระบุ";
      const departmentName = (item.specs?.department ?? "").toString().trim() || "ไม่ระบุหน่วยงาน";
      const price = extractPrice(item.specs?.price) ?? 50000;

      let ageYears = 0;
      let purchaseYear: number | null = null;
      if (purchaseDate && !isNaN(purchaseDate.getTime())) {
        ageYears = (today.getTime() - purchaseDate.getTime()) / msPerYear;
        purchaseYear = purchaseDate.getFullYear();

        const depreciationPerYear = price / usefulLifeYears;
        for (let year = purchaseYear; year <= currentYear; year++) {
          const ageAtYear = Math.max(0, year - purchaseYear);
          const accumulated = Math.min(ageAtYear, usefulLifeYears) * depreciationPerYear;
          const remaining = Math.max(price - accumulated, 0);
          const key = year.toString();

          if (!bookValueByYear[key]) bookValueByYear[key] = { total: 0, aged: 0 };
          bookValueByYear[key].total += remaining;
          if (ageAtYear >= usefulLifeYears) bookValueByYear[key].aged += remaining;
        }

        if (!departmentYearCounts[departmentName]) departmentYearCounts[departmentName] = {};
        const yearKey = purchaseYear.toString();
        if (!departmentYearCounts[departmentName][yearKey]) {
          departmentYearCounts[departmentName][yearKey] = { total: 0, active: 0, inactive: 0 };
        }
        departmentYearCounts[departmentName][yearKey].total += 1;
        if (activeStatuses.has(item.status)) departmentYearCounts[departmentName][yearKey].active += 1;
        else departmentYearCounts[departmentName][yearKey].inactive += 1;
      }

      const depreciationPerYear = price / usefulLifeYears;
      const accumulatedCurrent = Math.min(Math.max(ageYears, 0), usefulLifeYears) * depreciationPerYear;
      const remainingCurrent = Math.max(price - accumulatedCurrent, 0);

      if (ageYears >= usefulLifeYears) {
        if (!agingDepartmentMap[departmentName]) agingDepartmentMap[departmentName] = { count: 0, value: 0 };
        agingDepartmentMap[departmentName].count += 1;
        agingDepartmentMap[departmentName].value += remainingCurrent;
      }

      const ageFloor = Math.max(0, Math.floor(ageYears));
      for (let age = 0; age <= ageFloor; age++) {
        if (!survivalBuckets[age]) survivalBuckets[age] = { total: 0, alive: 0 };
        survivalBuckets[age].total += 1;
        if (activeStatuses.has(item.status)) survivalBuckets[age].alive += 1;
      }

      if (!depreciationMap[typeLabel]) depreciationMap[typeLabel] = { depreciation: 0, remaining: 0, total: 0 };
      depreciationMap[typeLabel].depreciation += accumulatedCurrent;
      depreciationMap[typeLabel].remaining += remainingCurrent;
      depreciationMap[typeLabel].total += price;
    });

    result.bookValueTrendFiltered = Object.entries(bookValueByYear)
      .map(([year, values]) => ({ year, totalValue: Number(values.total.toFixed(2)), agedValue: Number(values.aged.toFixed(2)) }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    result.agingByDepartmentFiltered = Object.entries(agingDepartmentMap)
      .map(([department, values]) => ({ department, count: values.count, value: Number(values.value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    result.survivalCurveFiltered = Object.entries(survivalBuckets)
      .map(([age, counts]) => ({ age: Number(age), survivalRate: counts.total > 0 ? Number(((counts.alive / counts.total) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => a.age - b.age);

    const departmentTotals = Object.entries(departmentYearCounts).map(([department, yearMap]) => ({
      department,
      total: Object.values(yearMap).reduce((sum, entry) => sum + entry.total, 0),
    }));
    const topDepartments = departmentTotals.sort((a, b) => b.total - a.total).slice(0, 6).map((item) => item.department);
    const heatmapYears = Array.from(new Set(
      Object.values(departmentYearCounts).flatMap((yearMap) => Object.keys(yearMap))
    ))
      .map((v) => String(v))
      .sort((a, b) => parseInt(a) - parseInt(b));

    if (topDepartments.length > 0 && heatmapYears.length > 0) {
      let maxCount = 0;
      const matrix = topDepartments.map((department) => {
        const values = heatmapYears.map((year) => {
          const cell = departmentYearCounts[department]?.[year];
          const total = cell?.total ?? 0;
          const active = cell?.active ?? 0;
          const inactive = cell?.inactive ?? 0;
          maxCount = Math.max(maxCount, total);
          return { year, total, active, inactive };
        });
        return { department, values };
      });
      result.heatmapDataFiltered = { departments: topDepartments, years: heatmapYears, matrix, maxCount };
    } else {
      result.heatmapDataFiltered = null;
    }

    result.depreciationByTypeFiltered = Object.entries(depreciationMap)
      .map(([type, values]) => ({ type, depreciation: Number(values.depreciation.toFixed(2)), remaining: Number(values.remaining.toFixed(2)), total: Number(values.total.toFixed(2)) }))
      .sort((a, b) => b.depreciation - a.depreciation);

    return result;
  }, [filteredEquipment, departmentResolver]);

  const renderTypeDistributionChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={typeDistributionFiltered}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {typeDistributionFiltered.map((entry, index) => (
            <Cell key={`type-cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderDepartmentDistributionChart = (height: number) => {
    const colorMap = new Map<string, string>();
    departmentDistributionFiltered.forEach((entry, index) => {
      if (!colorMap.has(entry.code)) {
        colorMap.set(entry.code, COLORS[index % COLORS.length]);
      }
    });

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={departmentDistributionFiltered}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="code" angle={-20} textAnchor="end" interval={0} height={80} />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => Number(value).toLocaleString("th-TH") }
            labelFormatter={(code) => {
              const match = departmentDistributionFiltered.find((item) => item.code === code);
              if (!match) {
                return code;
              }
              return `${match.code} • ${match.name}`;
            }}
          />
          <Legend />
          <Bar dataKey="value" name="จำนวนครุภัณฑ์" radius={[4, 4, 0, 0]}>
            {departmentDistributionFiltered.map((entry, index) => (
              <Cell
                key={`department-cell-${entry.code}-${index}`}
                fill={colorMap.get(entry.code) ?? COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderBrandDistributionChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={brandDistributionFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value: number) => Number(value).toLocaleString("th-TH") } />
        <Legend />
        <Bar dataKey="value" name="จำนวนครุภัณฑ์" fill="#8884d8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderCpuDistributionChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={cpuDistributionFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" name="จำนวน" fill="#82ca9d" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderRamDistributionChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={ramDistributionFiltered}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {ramDistributionFiltered.map((entry, index) => (
            <Cell key={`ram-cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderOsDistributionChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={osDistributionFiltered}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {osDistributionFiltered.map((entry, index) => (
            <Cell key={`os-cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderYearDistributionChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={yearDistributionFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value: number) => Number(value).toLocaleString("th-TH") } />
        <Legend />
        <Bar dataKey="value" name="จำนวนครุภัณฑ์" fill="#ffc658" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderBookValueTrendChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={bookValueTrendFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(value) => `${(Number(value) / 1_000_000).toFixed(1)}M`} />
        <Tooltip formatter={(value: any) => Number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} />
        <Legend />
        <Line type="monotone" dataKey="totalValue" name="มูลค่าคงเหลือรวม" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="agedValue" name="มูลค่า ≥ 5 ปี" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 3" activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderAgingByDepartmentChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={agingByDepartmentFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="department" interval={0} angle={-20} textAnchor="end" height={80} />
        <YAxis yAxisId="left" allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: any, name) => {
            if (name === "มูลค่าคงเหลือ (บาท)") {
              return [Number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }), name];
            }
            return [value, name];
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="count" name="จำนวน (รายการ)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="value" name="มูลค่าคงเหลือ (บาท)" stroke="#f97316" strokeWidth={2} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderSurvivalCurveChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={survivalCurveFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="age" label={{ value: "อายุ (ปี)", position: "insideBottom", offset: -5 }} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
        <Tooltip formatter={(value: any) => `${value}%`} />
        <Legend />
        <Line type="monotone" dataKey="survivalRate" name="เปอร์เซ็นต์ที่ยังใช้งาน" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderDepreciationByTypeChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={depreciationByTypeFiltered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="type" interval={0} angle={-20} textAnchor="end" height={80} />
        <YAxis tickFormatter={(value) => value.toLocaleString("th-TH") } />
        <Tooltip formatter={(value: number) => Number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} />
        <Legend />
        <Bar dataKey="depreciation" name="ค่าเสื่อมสะสม" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="remaining" name="มูลค่าคงเหลือ" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const chartRenderers: Record<ChartId, (height: number) => JSX.Element> = {
    typeDistribution: renderTypeDistributionChart,
    departmentDistribution: renderDepartmentDistributionChart,
    brandDistribution: renderBrandDistributionChart,
    cpuDistribution: renderCpuDistributionChart,
    ramDistribution: renderRamDistributionChart,
    osDistribution: renderOsDistributionChart,
    yearDistribution: renderYearDistributionChart,
    bookValueTrend: renderBookValueTrendChart,
    agingByDepartment: renderAgingByDepartmentChart,
    survivalCurve: renderSurvivalCurveChart,
    depreciationByType: renderDepreciationByTypeChart,
  };

  const renderExpandedChart = (chartId: ChartId) => chartRenderers[chartId](chartDimensions[chartId].expanded);

  type ChartHeaderProps = {
    icon: LucideIcon;
    iconClassName?: string;
    title: string;
    chartId: ChartId;
    disabled?: boolean;
    subtitle?: ReactNode;
  };

  const ChartHeader = ({ icon: Icon, iconClassName, title, chartId, disabled = false, subtitle }: ChartHeaderProps) => (
    <CardHeader className="flex flex-row items-start justify-between space-y-0">
      <div className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Icon className={iconClassName ?? "h-5 w-5 text-primary"} />
          {title}
        </CardTitle>
        {subtitle}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => setExpandedChart(chartId)}
        disabled={disabled}
      >
        <Maximize2 className="h-4 w-4" />
        <span className="sr-only">ขยายกราฟ {title}</span>
      </Button>
    </CardHeader>
  );

  // Pagination logic (10 per page)
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedEquipment = filteredEquipment.slice(startIndex, endIndex);

  // Reset page when filters or data change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, departmentFilter, yearFilter, statusFilter, ramFilter, osFilter, allEquipment.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const isDefaultFilters =
    searchTerm.trim() === "" &&
    typeFilter === "all" &&
    departmentFilter === "all" &&
    yearFilter === "all" &&
    statusFilter === "all" &&
    ramFilter === "all" &&
    osFilter === "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setDepartmentFilter("all");
    setYearFilter("all");
    setStatusFilter("all");
    setRamFilter("all");
    setOsFilter("all");
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Dialog open={!!expandedChart} onOpenChange={(open) => !open && setExpandedChart(null)}>
        {expandedChart && (
          <DialogContent className="max-w-5xl sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>{chartTitles[expandedChart]}</DialogTitle>
            </DialogHeader>
            <div className="mt-4" style={{ height: chartDimensions[expandedChart].expanded }}>
              {renderExpandedChart(expandedChart)}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{greetingMessage}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">ภาพรวมการจัดการครุภัณฑ์คอมพิวเตอร์</p>
        </div>
      </div>

      {/* Stats (move to top) */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-6">
        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ครุภัณฑ์ทั้งหมด
            </CardTitle>
            <Computer className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-primary">{filteredStats.total}</div>
            <p className="text-xs text-muted-foreground">
              จำนวนครุภัณฑ์ทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ใช้งานปกติ
            </CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-success">{filteredStats.working}</div>
            <p className="text-xs text-muted-foreground">
              {filteredStats.total > 0 ? (filteredStats.working / filteredStats.total * 100).toFixed(1) : 0}% ของทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ชำรุด
            </CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{filteredStats.broken}</div>
            <p className="text-xs text-muted-foreground">
              ต้องซ่อมแซม
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ซ่อมบำรุง
            </CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-warning">{filteredStats.maintenance}</div>
            <p className="text-xs text-muted-foreground">
              อยู่ระหว่างดำเนินการ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ประกันหมดอายุ
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{filteredStats.expired}</div>
            <p className="text-xs text-muted-foreground">
              ใน 3 เดือนข้างหน้า
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              อายุเฉลี่ย
            </CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-info" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-info">{filteredAdditionalStats.avgAge}</div>
            <p className="text-xs text-muted-foreground">ปี</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              อัตราการใช้งาน
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-success">{filteredAdditionalStats.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">ของทั้งหมด</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              มูลค่าประมาณ
            </CardTitle>
            <Computer className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-accent">{(filteredAdditionalStats.totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">บาท</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              หน่วยงาน
            </CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-secondary" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-secondary">{departmentDistributionFiltered.length}</div>
            <p className="text-xs text-muted-foreground">หน่วยงาน</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters (moved below stats) */}
      <Card className="shadow-soft border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 text-primary" />
            ค้นหาและกรองครุภัณฑ์
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">ค้นหา</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 w-full"
                  placeholder="ค้นหาชื่อครุภัณฑ์ เลขครุภัณฑ์ หรือหน่วยงาน"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">ประเภท</p>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">หน่วยงาน</p>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทุกหน่วยงาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหน่วยงาน</SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">ปีที่ซื้อ</p>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทุกปี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกปี</SelectItem>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">สถานะ</p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทุกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">RAM ที่ใช้</p>
              <Select value={ramFilter} onValueChange={setRamFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทุก RAM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุก RAM</SelectItem>
                  {ramOptions.map((ram) => (
                    <SelectItem key={ram} value={ram}>
                      {ram}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full lg:max-w-[240px]">
              <p className="text-sm font-medium text-muted-foreground">ระบบปฏิบัติการ</p>
              <Select value={osFilter} onValueChange={setOsFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทุก OS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุก OS</SelectItem>
                  {osOptions.map((os) => (
                    <SelectItem key={os} value={os}>
                      {os}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              พบ {filteredEquipment.length} รายการจากทั้งหมด {allEquipment.length} รายการ
            </p>
            <Button variant="outline" onClick={handleResetFilters} disabled={isDefaultFilters}>
              รีเซ็ตตัวกรอง
            </Button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {filteredEquipment.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  ไม่พบข้อมูลที่ตรงกับตัวกรองที่เลือก
                </div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">เลขครุภัณฑ์</TableHead>
                      <TableHead className="min-w-[180px]">ชื่อครุภัณฑ์</TableHead>
                      <TableHead className="min-w-[120px]">ประเภท</TableHead>
                      <TableHead className="min-w-[160px]">หน่วยงาน</TableHead>
                      <TableHead className="min-w-[100px]">ปีที่ซื้อ</TableHead>
                      <TableHead className="min-w-[120px]">สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedEquipment.map((item: any) => {
                      const departmentName = (item.specs?.department ?? "").toString().trim() || "ไม่ระบุหน่วยงาน";
                      const purchaseYear = item.purchase_date
                        ? new Date(item.purchase_date).getFullYear().toString()
                        : "-";

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{item.asset_number}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[item.brand, item.model].filter(Boolean).join(" • ") || "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.type || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{departmentName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{purchaseYear}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                  <p className="text-sm text-muted-foreground">
                    แสดง {filteredEquipment.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredEquipment.length)} จาก {filteredEquipment.length} รายการ
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Controls */}
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setShowMoreCharts((v) => !v)}>
          {showMoreCharts ? "ซ่อน กราฟเพิ่มเติม" : "แสดง กราฟเพิ่มเติม"}
        </Button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Equipment by Type */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={Server}
            title={chartTitles.typeDistribution}
            chartId="typeDistribution"
            disabled={typeDistributionFiltered.length === 0}
          />
          <CardContent>
            {typeDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลการกระจายตามประเภท</p>
            ) : (
              renderTypeDistributionChart(chartDimensions.typeDistribution.regular)
            )}
          </CardContent>
        </Card>

        {/* Equipment by Department */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={Building2}
            title={chartTitles.departmentDistribution}
            chartId="departmentDistribution"
            disabled={departmentDistributionFiltered.length === 0}
          />
          <CardContent>
            {departmentDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลหน่วยงานสำหรับสร้างกราฟ</p>
            ) : (
              renderDepartmentDistributionChart(chartDimensions.departmentDistribution.regular)
            )}
          </CardContent>
        </Card>

        {/* Additional charts (hidden until toggled) */}
        {showMoreCharts && <>
        {/* Equipment by Brand */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={Monitor}
            title={chartTitles.brandDistribution}
            chartId="brandDistribution"
            disabled={brandDistributionFiltered.length === 0}
          />
          <CardContent>
            {brandDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลยี่ห้อที่จะแสดง</p>
            ) : (
              renderBrandDistributionChart(chartDimensions.brandDistribution.regular)
            )}
          </CardContent>
        </Card>

        {/* CPU Distribution */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={Cpu}
            title={chartTitles.cpuDistribution}
            chartId="cpuDistribution"
            disabled={cpuDistributionFiltered.length === 0}
          />
          <CardContent>
            {cpuDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูล CPU ที่จะแสดง</p>
            ) : (
              renderCpuDistributionChart(chartDimensions.cpuDistribution.regular)
            )}
          </CardContent>
        </Card>

        {/* RAM Distribution */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={HardDrive}
            title={chartTitles.ramDistribution}
            chartId="ramDistribution"
            disabled={ramDistributionFiltered.length === 0}
          />
          <CardContent>
            {ramDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูล RAM ที่จะแสดง</p>
            ) : (
              renderRamDistributionChart(chartDimensions.ramDistribution.regular)
            )}
          </CardContent>
        </Card>

        {/* OS Distribution */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={Computer}
            title={chartTitles.osDistribution}
            chartId="osDistribution"
            disabled={osDistributionFiltered.length === 0}
          />
          <CardContent>
            {osDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลระบบปฏิบัติการที่จะแสดง</p>
            ) : (
              renderOsDistributionChart(chartDimensions.osDistribution.regular)
            )}
          </CardContent>
        </Card>
        
        {/* Equipment by Purchase Year */}
        <Card className="shadow-soft border-border">
          <ChartHeader
            icon={TrendingUp}
            title={chartTitles.yearDistribution}
            chartId="yearDistribution"
            disabled={yearDistributionFiltered.length === 0}
          />
          <CardContent>
            {yearDistributionFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลปีที่ซื้อที่จะแสดง</p>
            ) : (
              renderYearDistributionChart(chartDimensions.yearDistribution.regular)
            )}
          </CardContent>
        </Card>

      {/* Book Value Trend */}
      <Card className="shadow-soft border-border">
        <ChartHeader
          icon={TrendingUp}
          title={chartTitles.bookValueTrend}
          chartId="bookValueTrend"
          disabled={bookValueTrendFiltered.length === 0}
        />
        <CardContent>
          {bookValueTrendFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลมูลค่าตามบัญชี</p>
          ) : (
            renderBookValueTrendChart(chartDimensions.bookValueTrend.regular)
          )}
        </CardContent>
      </Card>

      {/* Aging Assets by Department */}
      <Card className="shadow-soft border-border">
        <ChartHeader
          icon={Building2}
          iconClassName="h-5 w-5 text-secondary"
          title={chartTitles.agingByDepartment}
          chartId="agingByDepartment"
          disabled={agingByDepartmentFiltered.length === 0}
        />
        <CardContent>
          {agingByDepartmentFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีครุภัณฑ์ที่มีอายุเกิน 5 ปี</p>
          ) : (
            renderAgingByDepartmentChart(chartDimensions.agingByDepartment.regular)
          )}
        </CardContent>
      </Card>

      {/* Survival Curve */}
      <Card className="shadow-soft border-border">
        <ChartHeader
          icon={Activity}
          iconClassName="h-5 w-5 text-accent"
          title={chartTitles.survivalCurve}
          chartId="survivalCurve"
          disabled={survivalCurveFiltered.length === 0}
        />
        <CardContent>
          {survivalCurveFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีข้อมูลสำหรับคำนวณอายุครุภัณฑ์</p>
          ) : (
            renderSurvivalCurveChart(chartDimensions.survivalCurve.regular)
          )}
        </CardContent>
      </Card>

      {/* Acquisition Heatmap */}
      <Card className="shadow-soft border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            Heatmap ปีที่ได้มารายหน่วยงาน
          </CardTitle>
          <p className="text-sm text-muted-foreground">เข้มขึ้น = มีจำนวนครุภัณฑ์มากในปีนั้น • ตัวเลขล่าง: ใช้งานอยู่ / ไม่พร้อมใช้งาน</p>
        </CardHeader>
        <CardContent>
          {!heatmapDataFiltered ? (
            <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลการจัดซื้อที่เพียงพอสำหรับสร้าง Heatmap</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-background px-3 py-2 text-left">หน่วยงาน</th>
                    {heatmapDataFiltered.years.map((year) => (
                      <th key={year} className="px-3 py-2 text-left">{year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapDataFiltered.matrix.map((row) => (
                    <tr key={row.department}>
                      <td className="sticky left-0 bg-background px-3 py-2 font-medium">{row.department}</td>
                      {row.values.map((cell) => {
                        const intensity = heatmapDataFiltered.maxCount > 0 ? cell.total / heatmapDataFiltered.maxCount : 0;
                        const background = intensity === 0 ? "transparent" : `rgba(37, 99, 235, ${0.15 + intensity * 0.7})`;
                        const textColor = intensity > 0.6 ? "text-white" : "text-foreground";
                        return (
                          <td
                            key={`${row.department}-${cell.year}`}
                            className={`px-3 py-2 text-center rounded-sm transition-colors ${textColor}`}
                            style={{ background }}
                            title={`รวม ${cell.total} รายการ | ใช้งานอยู่ ${cell.active} | ไม่พร้อมใช้งาน ${cell.inactive}`}
                          >
                            <div className="font-semibold">{cell.total}</div>
                            <div className="text-xs opacity-80">{cell.active}/{cell.inactive}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Equipment */}
      <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Computer className="h-5 w-5 text-primary" />
              ครุภัณฑ์ล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEquipment.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">ไม่มีข้อมูลครุภัณฑ์</p>
              ) : (
                recentEquipment.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {(item.type.includes("Desktop") || item.type.includes("คอมพิวเตอร์")) && <Computer className="h-4 w-4 text-primary" />}
                        {(item.type.includes("Printer") || item.type.includes("เครื่องพิมพ์")) && <Printer className="h-4 w-4 text-primary" />}
                        {(item.type.includes("Laptop") || item.type.includes("แล็ป")) && <Computer className="h-4 w-4 text-primary" />}
                        {(item.type.includes("Monitor") || item.type.includes("จอ")) && <Monitor className="h-4 w-4 text-primary" />}
                        {!(item.type.includes("Desktop") || item.type.includes("คอมพิวเตอร์") || item.type.includes("Printer") || item.type.includes("เครื่องพิมพ์") || item.type.includes("Laptop") || item.type.includes("แล็ป") || item.type.includes("Monitor") || item.type.includes("จอ")) && <Computer className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.id} • {item.location}</p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
      <Card className="shadow-soft border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            กิจกรรมล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">ไม่มีกิจกรรมล่าสุด</p>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Activity className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        โดย {activity.changedBy} • {activity.changedAt}
                      </p>
                    </div>
                  </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Depreciation by Type */}
      <Card className="shadow-soft border-border">
        <ChartHeader
          icon={TrendingUp}
          iconClassName="h-5 w-5 text-success"
          title={chartTitles.depreciationByType}
          chartId="depreciationByType"
          disabled={depreciationByTypeFiltered.length === 0}
        />
        <CardContent>
          {depreciationByTypeFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              ไม่มีข้อมูลค่าเสื่อมราคาที่สามารถคำนวณได้
            </p>
          ) : (
            renderDepreciationByTypeChart(chartDimensions.depreciationByType.regular)
          )}
        </CardContent>
      </Card>
      </>}
      </div>
    </div>
  );
}

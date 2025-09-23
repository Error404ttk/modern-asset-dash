import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, X-Client-Info, apikey, Apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestPayload = {
  email?: string;
  password?: string;
  fullName?: string;
  department?: string;
  role?: string;
};

const normalizeRole = (role?: string) => {
  if (!role) return "user";
  const allowedRoles = new Set(["super_admin", "admin", "user"]);
  if (allowedRoles.has(role)) return role;
  if (role === "ผู้ดูแลระบบสูงสุด") return "super_admin";
  if (role === "ผู้ดูแลระบบ") return "admin";
  return "user";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่พบข้อมูลการยืนยันตัวตน" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่สามารถยืนยันตัวตนได้" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }

    const { data: userProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role, email, full_name")
      .eq("user_id", user.id)
      .single();

    if (profileError || !userProfile || (userProfile.role !== "super_admin" && userProfile.role !== "admin")) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่มีสิทธิ์ในการเพิ่มผู้ใช้งาน" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
      );
    }

    const { email, password, fullName, department, role }: RequestPayload = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ success: false, error: "กรุณาระบุอีเมล รหัสผ่าน และชื่อ-นามสกุล" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const normalizedRole = normalizeRole(role);

    const { data: createdUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        department: department ?? null,
        role: normalizedRole,
      },
    });

    if (createUserError || !createdUser?.user) {
      return new Response(
        JSON.stringify({ success: false, error: createUserError?.message ?? "ไม่สามารถสร้างผู้ใช้ใหม่ได้" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const newUserId = createdUser.user.id;

    const { error: profileInsertError } = await supabaseClient
      .from("profiles")
      .insert({
        user_id: newUserId,
        email,
        full_name: fullName,
        role: normalizedRole,
        department: department ?? null,
      });

    if (profileInsertError) {
      console.error("Error inserting profile:", profileInsertError);
      return new Response(
        JSON.stringify({ success: false, error: "สร้างผู้ใช้สำเร็จแต่ไม่สามารถบันทึกโปรไฟล์ได้" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const { data: newProfile, error: newProfileError } = await supabaseClient
      .from("profiles")
      .select("id, email, full_name, role, department")
      .eq("user_id", newUserId)
      .single();

    if (newProfileError) {
      console.error("Error fetching new profile for audit:", newProfileError);
    } else if (newProfile) {
      const { error: auditError } = await supabaseClient.from('audit_logs').insert({
        table_name: 'profiles',
        record_id: newProfile.id,
        action: 'CREATE',
        field_name: 'entire_record',
        old_value: null,
        new_value: JSON.stringify(newProfile),
        changed_by_user_id: user.id,
        changed_by: userProfile.full_name || userProfile.email,
        user_email: userProfile.email,
        changed_at: new Date().toISOString(),
      });

      if (auditError) {
        console.error('Error writing audit log for new user:', auditError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว",
        userId: newUserId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error creating user:", error);
    return new Response(
      JSON.stringify({ success: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

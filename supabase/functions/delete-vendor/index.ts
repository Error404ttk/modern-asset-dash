import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { id, reason, password } = await req.json();

    if (!id || !reason || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "ข้อมูลไม่ครบถ้วน" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่พบข้อมูลการยืนยันตัวตน" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่สามารถยืนยันตัวตนได้" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      return new Response(
        JSON.stringify({ success: false, error: "คุณไม่มีสิทธิ์ในการลบข้อมูล" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ success: false, error: "รหัสผ่าน Super Admin ไม่ถูกต้อง" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: vendor, error: fetchError } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !vendor) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่พบข้อมูลผู้ขาย" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: deleteError } = await supabase
      .from("vendors")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: "ไม่สามารถลบผู้ขายได้" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await supabase
      .from("audit_logs")
      .insert({
        table_name: "vendors",
        record_id: id,
        action: "DELETE",
        field_name: "entire_record",
        old_value: JSON.stringify(vendor),
        new_value: null,
        changed_by_user_id: user.id,
        changed_by: profile.email,
        user_email: profile.email,
        reason,
      });

    return new Response(
      JSON.stringify({ success: true, message: "ลบข้อมูลผู้ขายเรียบร้อยแล้ว" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("delete-vendor error", error);
    return new Response(
      JSON.stringify({ success: false, error: "เกิดข้อผิดพลาดภายในระบบ" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

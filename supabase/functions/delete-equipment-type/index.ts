import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { id, reason, password } = await req.json();

    console.log('Delete equipment type request:', { id, reason });

    if (!id || !reason || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get current user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'ไม่พบข้อมูลการยืนยันตัวตน' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'ไม่สามารถยืนยันตัวตนได้' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'คุณไม่มีสิทธิ์ในการลบข้อมูล' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify super admin password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ success: false, error: 'รหัสผ่าน Super Admin ไม่ถูกต้อง' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get equipment type info before deletion
    const { data: equipmentType, error: getTypeError } = await supabase
      .from('equipment_types')
      .select('*')
      .eq('id', id)
      .single();

    if (getTypeError || !equipmentType) {
      return new Response(
        JSON.stringify({ success: false, error: 'ไม่พบข้อมูลประเภทครุภัณฑ์' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete the equipment type
    const { error: deleteError } = await supabase
      .from('equipment_types')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'ไม่สามารถลบประเภทครุภัณฑ์ได้' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the deletion
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'equipment_types',
        record_id: id,
        action: 'DELETE',
        field_name: 'entire_record',
        old_value: JSON.stringify(equipmentType),
        new_value: null,
        changed_by_user_id: user.id,
        changed_by: profile.email,
        user_email: profile.email,
        reason: reason,
      });

    console.log('Equipment type deleted successfully:', id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ลบประเภทครุภัณฑ์เรียบร้อยแล้ว' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'เกิดข้อผิดพลาดภายในระบบ' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
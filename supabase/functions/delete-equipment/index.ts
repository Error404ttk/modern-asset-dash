import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { equipmentId, reason, superAdminPassword, userAuthToken } = await req.json();

    console.log('Delete equipment request:', { equipmentId, reason });

    if (!equipmentId || !reason || !superAdminPassword || !userAuthToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify super admin password using current user's credentials
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(userAuthToken);
    
    if (userError || !user) {
      console.log('User token verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if current user is super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, email, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      console.log('User role verification failed:', profileError, profile);
      return new Response(
        JSON.stringify({ error: 'คุณไม่มีสิทธิ์ในการลบข้อมูล' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify super admin password using their actual email
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: profile.email,
      password: superAdminPassword,
    });

    if (signInError) {
      console.log('Super admin password verification failed:', signInError);
      return new Response(
        JSON.stringify({ error: 'รหัสผ่าน Super Admin ไม่ถูกต้อง' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }


    // Get equipment data before deletion for audit log
    const { data: equipment, error: equipmentError } = await supabaseAdmin
      .from('equipment')
      .select('*')
      .eq('id', equipmentId)
      .single();

    if (equipmentError || !equipment) {
      console.log('Equipment not found:', equipmentError);
      return new Response(
        JSON.stringify({ error: 'ไม่พบข้อมูลครุภัณฑ์' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the deletion in audit_logs before deleting
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert([
        {
          table_name: 'equipment',
          record_id: equipmentId,
          action: 'DELETE',
          field_name: 'entire_record',
          old_value: JSON.stringify(equipment),
          new_value: null,
          reason: reason,
          changed_by_user_id: user.id,
          user_email: profile.email,
          changed_by: profile.full_name || profile.email
        }
      ]);

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Delete the equipment
    const { error: deleteError } = await supabaseAdmin
      .from('equipment')
      .delete()
      .eq('id', equipmentId);

    if (deleteError) {
      console.error('Delete equipment error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Equipment deleted successfully:', equipmentId);

    return new Response(
      JSON.stringify({ success: true, message: 'ลบครุภัณฑ์สำเร็จ' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Delete equipment function error:', error);
    
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
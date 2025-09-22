import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { userId, reason, superAdminPassword } = await req.json()

    console.log('Delete user request:', { userId, reason, hasSuperAdminPassword: !!superAdminPassword });

    if (!userId || !reason || !superAdminPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: userId, reason, and superAdminPassword' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    // Get current user from Authorization header (secure approach)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่พบข้อมูลการยืนยันตัวตน' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่สามารถยืนยันตัวตนได้' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, email, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      console.error('User is not super admin:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่มีสิทธิ์ในการลบผู้ใช้งาน' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 403 
        }
      )
    }

    // Verify super admin password using their actual email
    const tempClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { error: signInError } = await tempClient.auth.signInWithPassword({
      email: profile.email,
      password: superAdminPassword,
    });

    if (signInError) {
      console.error('Super admin authentication failed:', signInError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    // Get user information before deletion for audit log
    const { data: userToDelete, error: userError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (userError || !userToDelete) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่พบผู้ใช้งานที่ต้องการลบ' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 404 
        }
      )
    }

    // Log the deletion in audit_logs before actually deleting
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        table_name: 'profiles',
        record_id: userToDelete.id,
        action: 'DELETE',
        field_name: 'user_deletion',
        old_value: JSON.stringify(userToDelete),
        new_value: null,
        changed_by_user_id: user.id,
        changed_by: profile.full_name || profile.email,
        user_email: profile.email,
        reason: reason,
        metadata: {
          deleted_user_email: userToDelete.email,
          deleted_user_name: userToDelete.full_name,
          deletion_reason: reason
        }
      })

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    // Delete the user profile (this will cascade to other related records if FK constraints are set up)
    const { error: deleteProfileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่สามารถลบโปรไฟล์ผู้ใช้งานได้' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      )
    }

    // Delete the user from auth.users table
    const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError);
      // Note: Profile is already deleted, but we'll still return success
      // as the main user data is removed
    }

    console.log('User deleted successfully:', { userId, userEmail: userToDelete.email });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'ลบผู้ใช้งานเรียบร้อยแล้ว'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
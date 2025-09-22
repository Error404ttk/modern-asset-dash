import { supabase } from "@/integrations/supabase/client";

export async function createSuperAdminUser() {
  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'srpadmin@system.local',
      password: 'S@r@pee11135',
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { error: authError };
    }

    if (authData.user) {
      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: 'srpadmin@system.local',
          full_name: 'Super Administrator',
          role: 'super_admin'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: profileError };
      }

      console.log('Super admin user created successfully');
      return { success: true, user: authData.user };
    }
  } catch (error) {
    console.error('Error creating super admin:', error);
    return { error };
  }
}

// Call this function once to create the super admin
// createSuperAdminUser();
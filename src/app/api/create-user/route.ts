import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // 1. Verify caller is authorized
    const supabaseServer = await createServerClient()
    const { data: { session } } = await supabaseServer.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get caller profile to check role
    const { data: callerProfile } = await supabaseServer
      .from('profiles')
      .select('role, job_type')
      .eq('id', session.user.id)
      .single()

    const canManage = callerProfile?.role === 'ceo' || 
                      callerProfile?.role === 'super_admin' || 
                      callerProfile?.role === 'owner' || 
                      callerProfile?.job_type === 'hr'

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { 
      email, 
      password, 
      full_name,
      role = 'employee',
      job_type = 'analyst',
      job_level = '',
      employee_type = 'employee',
      is_office_manager = false,
      is_busdev = false,
      is_hr = false,
      is_female = false
    } = body

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
    }

    // 3. Initialize Supabase Admin Client
    // This requires Service Role Key to bypass RLS and create users directly
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 4. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    const newUserId = authData.user.id

    // 5. Short delay to ensure trigger has created the profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 6. Update the auto-created profile with role access and flags
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role,
        job_type,
        job_level,
        employee_type,
        is_office_manager,
        is_busdev,
        is_hr,
        is_female
      })
      .eq('id', newUserId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Even if profile update fails, user was created, so return partial success
      return NextResponse.json({ 
        message: 'User created but profile update failed', 
        user: authData.user,
        profileError: profileError.message 
      }, { status: 201 })
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: authData.user
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

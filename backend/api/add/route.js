import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    )

    const { email, password, full_name, role } = await request.json()

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    const createdUserId = data?.user?.id

    if (createdUserId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{ id: createdUserId, full_name: full_name || null, role: role || 'teacher' }])
      if (profileError) {
        return Response.json({ error: profileError.message }, { status: 400 })
      }
    }

    return Response.json({ data }, { status: 200 })
  } catch (err) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                                         { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions)             { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ดึง refresh_token ก่อนเพื่อ revoke
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single()

  // Revoke token จาก Google (optional แต่ดี)
  if (userData?.google_refresh_token) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${userData.google_refresh_token}`,
      { method: 'POST' }
    ).catch(() => {})  // ไม่ต้อง error ถ้า revoke ไม่สำเร็จ
  }

  // ลบ token ออกจาก DB
  await supabaseAdmin
    .from('users')
    .update({
      google_refresh_token:       null,
      google_calendar_connected:  false,
    })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}

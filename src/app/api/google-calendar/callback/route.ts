import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code   = searchParams.get('code')
  const userId = searchParams.get('state')   // user.id ที่ส่งมาจาก auth route
  const error  = searchParams.get('error')

  // ── User ปฏิเสธการ connect ──────────────────────────────────────────────────
  if (error || !code || !userId) {
    return NextResponse.redirect(
      new URL('/calendar?gcal=cancelled', request.url)
    )
  }

  try {
    // ── 1. แลก code เป็น access_token + refresh_token ──────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
        grant_type:    'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.refresh_token) {
      // refresh_token จะมาเฉพาะครั้งแรก หรือเมื่อ prompt=consent
      console.error('No refresh_token received:', tokenData)
      return NextResponse.redirect(
        new URL('/calendar?gcal=error&msg=no_refresh_token', request.url)
      )
    }

    // ── 2. บันทึก refresh_token ลง public.users ────────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        google_refresh_token:        tokenData.refresh_token,
        google_calendar_connected:   true,
      })
      .eq('id', userId)

    if (dbError) throw dbError

    return NextResponse.redirect(
      new URL('/calendar?gcal=connected', request.url)
    )
  } catch (err: any) {
    console.error('Google Calendar callback error:', err)
    return NextResponse.redirect(
      new URL('/calendar?gcal=error', request.url)
    )
  }
}

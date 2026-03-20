import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── ดึง access_token ใหม่จาก refresh_token ────────────────────────────────────
async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token:  refreshToken,
      client_id:      process.env.GOOGLE_CLIENT_ID!,
      client_secret:  process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:     'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to refresh access token: ' + JSON.stringify(data))
  return data.access_token
}

// ── แปลง Supabase event → Google Calendar event format ────────────────────────
function toGoogleEvent(event: any) {
  const startDt = new Date(event.start_time)
  const endDt   = new Date(event.end_time)

  // ตรวจ allday (00:00 → 23:59)
  const isAllDay =
    startDt.getHours() === 0 && startDt.getMinutes() === 0 &&
    endDt.getHours() === 23 && endDt.getMinutes() === 59

  return {
    summary:     event.title,
    description: [
      event.description || '',
      event.projects?.name_th ? `โครงการ: ${event.projects.name_th}` : '',
    ].filter(Boolean).join('\n'),
    location: event.location || undefined,

    // allDay ใช้ date, มีเวลาใช้ dateTime
    start: isAllDay
      ? { date: startDt.toISOString().split('T')[0] }
      : { dateTime: event.start_time, timeZone: 'Asia/Bangkok' },
    end: isAllDay
      ? { date: new Date(endDt.getTime() + 60000).toISOString().split('T')[0] }  // +1 นาทีเพื่อให้ end date ถูกต้อง
      : { dateTime: event.end_time, timeZone: 'Asia/Bangkok' },

    // เก็บ supabase event id ไว้เป็น extended property เพื่อใช้ตรวจ duplicate
    extendedProperties: {
      private: { supabase_event_id: event.id },
    },
  }
}

// ── POST /api/google-calendar/sync ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 1. Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                                          { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions)  { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions)              { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 2. ดึง refresh_token จาก DB
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single()

    if (!userData?.google_refresh_token) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
    }

    // 3. ดึง access_token
    const accessToken = await getAccessToken(userData.google_refresh_token)

    // 4. ดึง events จาก Supabase (เฉพาะ main + standalone)
    const { data: events } = await supabase
      .from('events')
      .select('*, projects(id, name_th)')
      .or('project_id.is.null,event_type.eq.main')
      .order('start_time', { ascending: true })

    if (!events || events.length === 0) {
      return NextResponse.json({ synced: 0, message: 'ไม่มีกิจกรรมที่จะ sync' })
    }

    // 5. ดึง events ที่มีอยู่แล้วใน Google Calendar ของ user (เพื่อไม่ create ซ้ำ)
    const existingRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=supabase_event_id%3D*&maxResults=2500`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const existingData = await existingRes.json()
    const existingGoogleEvents: any[] = existingData.items || []

    // Map: supabase_event_id → google event id
    const existingMap = new Map<string, string>()
    for (const ge of existingGoogleEvents) {
      const sid = ge.extendedProperties?.private?.supabase_event_id
      if (sid) existingMap.set(sid, ge.id)
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const event of events) {
      const googleEvent = toGoogleEvent(event)
      const existingGoogleId = existingMap.get(event.id)

      try {
        if (existingGoogleId) {
          // ── Update existing ──
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingGoogleId}`,
            {
              method:  'PUT',
              headers: {
                Authorization:  `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent),
            }
          )
          updated++
        } else {
          // ── Create new ──
          await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method:  'POST',
              headers: {
                Authorization:  `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent),
            }
          )
          created++
        }
      } catch (err: any) {
        errors.push(`${event.title}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      synced:  created + updated,
      created,
      updated,
      errors:  errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

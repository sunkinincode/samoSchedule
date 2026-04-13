import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_MEMBERS: Record<string, { role: string, department: string }> = {
  '6710210395': { role: 'admin', department: 'นายกสโมสร' },
  '6710210374': { role: 'admin', department: 'อุปนายกฝ่ายบริหาร' },
  '6710210521': { role: 'admin', department: 'เหรัญญิก' },
  '6810210416': { role: 'admin', department: 'อุปนายกฝ่ายกลยุทธ์และแผนงาน' },
  '6810210435': { role: 'admin', department: 'เลขานุการ' },
  '6810210750': { role: 'admin', department: 'อุปนายกฝ่ายกิจการภายใน' },
  '6810210889': { role: 'admin', department: 'อุปนายกฝ่ายกิจการภายนอก' },
  '6810210013': { role: 'admin', department: 'ประธานฝ่ายประชาสัมพันธ์' },
  '6810210076': { role: 'member', department: 'ประธานฝ่ายวิชาการ' },
  '6810210148': { role: 'member', department: 'ประธานฝ่ายสวัสดิการ' },
  '6810210255': { role: 'member', department: 'ประธานฝ่ายทะเบียนและประเมินผล' },
  '6810210259': { role: 'member', department: 'ประธานฝ่ายกิจกรรมพิเศษ' },
  '6810210313': { role: 'member', department: 'ประธานฝ่ายศิลป์' },
  '6810210394': { role: 'member', department: 'ประธานฝ่ายอาคารและสถานที่' },
  '6810210432': { role: 'member', department: 'ประธานฝ่ายโสตทัศนูปกรณ์' },
  '6810210477': { role: 'member', department: 'ประธานฝ่ายพยาบาล' },
  '6810210485': { role: 'member', department: 'ประธานฝ่ายพิธีการ' },
  '6810210553': { role: 'member', department: 'ประธานฝ่ายจัดการระบบ' },
  '6810210625': { role: 'member', department: 'ประธานฝ่ายพัสดุ' },
  '6810210695': { role: 'member', department: 'ประธานฝ่ายอินโฟกราฟิก' },
  '6810210752': { role: 'member', department: 'ประธานฝ่ายธุรการ' },
  '6810210910': { role: 'member', department: 'ประธานฝ่ายกีฬา' },
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const email = `${username}@psu.ac.th`

    // 1. ดักสิทธิ์เข้าใช้งาน
    const memberInfo = ALLOWED_MEMBERS[username]
    if (!memberInfo) {
      return NextResponse.json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าใช้งานระบบของสโมสรนักศึกษา' }, { status: 403 })
    }

    // เตรียม Supabase Client สำหรับจัดการ Session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )

    // 🚀 OPTIMIZATION 1: ทางลัด (Fast Path)
    // ลองเข้าสู่ระบบผ่าน Supabase ตรงๆ ก่อน ถ้าสำเร็จแปลว่าเคยล็อกอินแล้วและรหัสเดิม = ข้าม API Moodle ไปเลย!
    const { data: fastLogin, error: fastLoginError } = await supabase.auth.signInWithPassword({ email, password })
    if (!fastLoginError && fastLogin.session) {
      return NextResponse.json({ success: true }) 
    }

    // 🚀 OPTIMIZATION 2: ทางหลัก (Fallback) 
    // กรณีผู้ใช้ใหม่ หรือไปเปลี่ยนรหัสผ่านที่ Moodle มา ถึงจะยอมวิ่งไปเช็ก API ของมอ
    const psuRes = await fetch('https://lms.psu.ac.th/login/token.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password, service: 'moodle_mobile_app' })
    })

    const psuData = await psuRes.json()

    if (psuData.token) {
      let fullName = username;
      let avatarUrl = null;

      try {
        const infoRes = await fetch(`https://lms.psu.ac.th/webservice/rest/server.php?wstoken=${psuData.token}&wsfunction=core_user_get_users_by_field&field=username&values[0]=${username}&moodlewsrestformat=json`)
        const infoData = await infoRes.json()
        if (Array.isArray(infoData) && infoData.length > 0) {
          fullName = infoData[0]?.fullname || username
          avatarUrl = infoData[0]?.profileimageurl || null
        }
      } catch (err) {
        console.warn("ดึงข้อมูลโปรไฟล์ไม่สำเร็จ:", err)
      }

      // 🚀 OPTIMIZATION 3: เลิกใช้ listUsers() (ช้ามาก) เปลี่ยนมา Query หาจากตารางตรงๆ
      const { data: dbUser } = await supabaseAdmin.from('users').select('id, avatar_url').eq('student_id', username).single()

      let finalAvatarUrl = avatarUrl
      if (dbUser?.avatar_url && !dbUser.avatar_url.includes('lms.psu.ac.th')) {
        finalAvatarUrl = dbUser.avatar_url
      }

      const metadata = {
        student_id:     username,
        full_name:      fullName,
        avatar_url:     finalAvatarUrl,
        department:     memberInfo.department,
        role:           memberInfo.role,
        lms_avatar_url: avatarUrl,
      }

      let userId = dbUser?.id;

      if (userId) {
        // อัปเดตรหัสผ่านและข้อมูลใน Auth
        await supabaseAdmin.auth.admin.updateUserById(userId, { password, user_metadata: metadata })
      } else {
        // สร้างผู้ใช้ใหม่
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: metadata
        })
        if (createErr) throw createErr;
        userId = newUser.user.id;
      }

      // บันทึกข้อมูลลงตาราง public.users
      if (userId) {
        await supabaseAdmin.from('users').upsert({
          id:         userId,
          student_id: username,
          full_name:  fullName,
          role:       memberInfo.role,
          department: memberInfo.department,
          avatar_url: finalAvatarUrl,
        })
      }

      // สร้าง Session
      await supabase.auth.signInWithPassword({ email, password })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'รหัสผ่าน LMS ไม่ถูกต้อง' }, { status: 401 })
  } catch (error: any) {
    console.error("API ERROR:", error)
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 })
  }
}
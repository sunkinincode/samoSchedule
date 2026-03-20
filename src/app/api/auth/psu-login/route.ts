import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_MEMBERS: Record<string, { role: string, department: string }> = {
  // --- ทีมบริหาร (Admin) สามารถสร้างกิจกรรมได้ ---
  '6710210395': { role: 'admin', department: 'นายกสโมสร' },
  '6710210374': { role: 'admin', department: 'อุปนายกฝ่ายบริหาร' },
  '6710210521': { role: 'admin', department: 'เหรัญญิก' },
  '6810210416': { role: 'admin', department: 'อุปนายกฝ่ายกลยุทธ์และแผนงาน' },
  '6810210435': { role: 'admin', department: 'เลขานุการ' },
  '6810210750': { role: 'admin', department: 'อุปนายกฝ่ายกิจการภายใน' },
  '6810210889': { role: 'admin', department: 'อุปนายกฝ่ายกิจการภายนอก' },

  // --- ทีมประธานฝ่าย (Support/Member) ดูได้อย่างเดียว ---
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

    // 🌟 2. ดักไว้ก่อนเลย ถ้าไม่อยู่ใน 22 คนนี้ ให้เตะออกทันที
    const memberInfo = ALLOWED_MEMBERS[username]
    if (!memberInfo) {
      return NextResponse.json(
        { success: false, message: 'คุณไม่มีสิทธิ์เข้าใช้งานระบบของสโมสรนักศึกษา' },
        { status: 403 }
      )
    }

    // 3. ตรวจสอบกับ PSU LMS
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

      // 4. จัดการ User ในระบบ Auth
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
      let existingUser = userData?.users.find(u => u.email === email)

      // ตรวจสอบว่า user มีรูป custom (อัปโหลดเอง) อยู่แล้วหรือไม่
      // ถ้ามี → ใช้รูป custom นั้นต่อไป อย่า overwrite ด้วยรูปจาก LMS
      let finalAvatarUrl = avatarUrl

      if (existingUser) {
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('avatar_url')
          .eq('id', existingUser.id)
          .single()

        // รูป custom จะมาจาก Supabase Storage (ไม่มี lms.psu.ac.th ใน URL)
        const storedAvatar = dbUser?.avatar_url
        if (storedAvatar && !storedAvatar.includes('lms.psu.ac.th')) {
          finalAvatarUrl = storedAvatar
        }
      }

      const metadata = {
        student_id:     username,
        full_name:      fullName,
        avatar_url:     finalAvatarUrl,
        department:     memberInfo.department,
        role:           memberInfo.role,
        lms_avatar_url: avatarUrl,
      }

      if (!existingUser) {
        const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: metadata
        })
        existingUser = newUser.user || undefined
      } else {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password, user_metadata: metadata
        })
      }

      // 🌟 5. บันทึกข้อมูลลงตาราง public.users ใน Database ด้วย!
      if (existingUser) {
        await supabaseAdmin.from('users').upsert({
          id:         existingUser.id,
          student_id: username,
          full_name:  fullName,
          role:       memberInfo.role,
          department: memberInfo.department,
          avatar_url: finalAvatarUrl,
        })
      }

      // 6. สร้าง Session
      const cookieStore = await cookies()
      const response = NextResponse.json({ success: true })
      
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

      await supabase.auth.signInWithPassword({ email, password })
      return response
    }

    return NextResponse.json({ success: false, message: 'รหัสผ่าน LMS ไม่ถูกต้อง' }, { status: 401 })
  } catch (error: any) {
    console.error("API ERROR:", error)
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 })
  }
}
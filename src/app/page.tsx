import Link from 'next/link'
import {
  Calendar, FolderKanban, Users, Download,
  ArrowRight, ChevronRight, CalendarCheck,
  ListTodo, RefreshCw, Upload, UserCircle2,
  Bell, Shield, Sparkles,
} from 'lucide-react'

// ─── Feature data ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: <Calendar size={24} />,
    color: 'blue',
    title: 'ปฏิทินกิจกรรม',
    desc: 'ดูกิจกรรมทั้งหมดของสโมสรฯ ในมุมมองรายเดือนหรือรายการ สีแยกตามโครงการ ไม่พลาดทุกงาน',
  },
  {
    icon: <FolderKanban size={24} />,
    color: 'indigo',
    title: 'บริหารโครงการ',
    desc: 'ดูแลโครงการที่รับผิดชอบ แยกแยะงานเตรียมและวันงานจริง พร้อม QR Line กลุ่ม',
  },
  {
    icon: <CalendarCheck size={24} />,
    color: 'emerald',
    title: 'วันงานจริง',
    desc: 'เพิ่มวันจัดงานให้ปรากฏบนปฏิทินของทุกคนในสโมสรฯ อัปเดตแบบ real-time',
  },
  {
    icon: <ListTodo size={24} />,
    color: 'amber',
    title: 'งานเตรียม',
    desc: 'จัดการสิ่งที่ต้องเตรียมก่อนงาน เห็นเฉพาะผู้ดูแลโครงการนั้น ไม่รกปฏิทินทั่วไป',
  },
  {
    icon: <RefreshCw size={24} />,
    color: 'cyan',
    title: 'Sync Google Calendar',
    desc: 'เชื่อมต่อ Google Calendar ส่วนตัว กิจกรรมทั้งหมดจะ sync ไปยังปฏิทิน Google ของคุณ',
  },
  {
    icon: <Upload size={24} />,
    color: 'purple',
    title: 'นำเข้าจาก CSV',
    desc: 'เพิ่มกิจกรรมจำนวนมากได้ครั้งเดียวผ่านไฟล์ CSV ประหยัดเวลาในการป้อนข้อมูล',
  },
  {
    icon: <Users size={24} />,
    color: 'rose',
    title: 'ทีมผู้ดูแล',
    desc: 'ดูโปรไฟล์ผู้ดูแลทุกคนในโครงการ ฝ่าย ตำแหน่ง และโครงการที่รับผิดชอบ',
  },
  {
    icon: <Download size={24} />,
    color: 'teal',
    title: 'ส่งออก .ics',
    desc: 'Export กิจกรรมทั้งหมดเป็นไฟล์ .ics นำเข้า Apple Calendar, Outlook ได้ทันที',
  },
  {
    icon: <UserCircle2 size={24} />,
    color: 'orange',
    title: 'โปรไฟล์ส่วนตัว',
    desc: 'ล็อกอินด้วยบัญชี PSU LMS อัปโหลดรูปโปรไฟล์ของตัวเอง ระบบจดจำเสมอ',
  },
]

const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'ring-blue-100' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-100' },
  emerald:{ bg: 'bg-emerald-50',icon: 'text-emerald-600',ring: 'ring-emerald-100' },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  ring: 'ring-amber-100' },
  cyan:   { bg: 'bg-cyan-50',   icon: 'text-cyan-600',   ring: 'ring-cyan-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-100' },
  rose:   { bg: 'bg-rose-50',   icon: 'text-rose-600',   ring: 'ring-rose-100' },
  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   ring: 'ring-teal-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', ring: 'ring-orange-100' },
}

// ─── Flow steps ───────────────────────────────────────────────────────────────
const steps = [
  { n: '01', title: 'Login ด้วย PSU LMS', desc: 'ใช้รหัสนักศึกษาและรหัสผ่าน LMS เดิม ไม่ต้องสมัครใหม่' },
  { n: '02', title: 'เลือกโครงการของคุณ', desc: 'ระบบดึงโครงการที่คุณเป็นผู้ดูแลมาแสดงอัตโนมัติ' },
  { n: '03', title: 'เพิ่มกิจกรรมและงาน', desc: 'สร้างวันงานจริง งานเตรียม หรือนำเข้าจาก CSV ได้เลย' },
  { n: '04', title: 'ทุกคนเห็นพร้อมกัน', desc: 'วันงานจริงปรากฏบนปฏิทินของทุกคนในสโมสรฯ ทันที' },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Google Sans', 'Noto Sans Thai', sans-serif" }}>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Science beaker icon */}
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2">
                <path d="M9 3h6M9 3v8L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-3L15 11V3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9.5" cy="15.5" r="1" fill="white" stroke="none"/>
                <circle cx="13" cy="17" r="0.8" fill="white" stroke="none"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Samo Schedule</p>
              <p className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">คณะวิทยาศาสตร์ มอ.</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
          >
            เข้าสู่ระบบ <ChevronRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl opacity-70" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-40 left-0 w-56 h-56 bg-cyan-100 rounded-full blur-3xl opacity-40" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#1d4ed8 1px, transparent 1px), linear-gradient(90deg, #1d4ed8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-4xl mx-auto px-5 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <Sparkles size={12} />
            สโมสรนักศึกษาคณะวิทยาศาสตร์ มหาวิทยาลัยสงขลานครินทร์
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.15] tracking-tight mb-5">
            บริหารโครงการ<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              ให้ง่ายกว่าเดิม
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto mb-10">
            ระบบจัดการโครงการและปฏิทินกิจกรรมสำหรับทีมงานสโมสรฯ<br className="hidden md:block"/>
            Login ด้วยบัญชี PSU LMS เดิม ไม่ต้องสมัครใหม่
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 text-base"
            >
              เริ่มใช้งานเลย <ArrowRight size={18} />
            </Link>
            <Link
              href="/calendar"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all text-base"
            >
              <Calendar size={18} className="text-blue-500" /> ดูปฏิทิน
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
            {[
              { icon: <Shield size={14} />, text: 'PSU LMS Authentication' },
              { icon: <RefreshCw size={14} />, text: 'Sync Google Calendar' },
              { icon: <Bell size={14} />, text: 'Real-time Updates' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <span className="text-blue-400">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calendar Preview mockup ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-100">
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-200 bg-white">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-4 bg-gray-100 rounded-lg py-1.5 px-3 text-[11px] text-gray-400 font-medium">
              samo-schedule.vercel.app/calendar
            </div>
          </div>

          {/* Fake calendar grid */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">2026</p>
                <p className="text-xl font-bold text-gray-900">มิถุนายน</p>
              </div>
              <div className="flex gap-2">
                {['งานเตรียม', 'ส่งออก', 'Sync Google'].map(b => (
                  <div key={b} className="px-3 py-1.5 bg-gray-100 rounded-xl text-[10px] font-semibold text-gray-500">{b}</div>
                ))}
                <div className="px-3 py-1.5 bg-blue-600 rounded-xl text-[10px] font-semibold text-white">+ สร้าง</div>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-1.5">{d}</div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden">
              {[
                { d: 31, dim: true,  events: [] },
                { d: 1,  events: [] },
                { d: 2,  events: [] },
                { d: 3,  events: [{ c: '#DBEAFE', b: '#3B82F6', t: 'ประชุมสโมสรฯ' }] },
                { d: 4,  events: [{ c: '#DBEAFE', b: '#3B82F6', t: 'ประชุมสโมสรฯ' }] },
                { d: 5,  events: [{ c: '#FED7AA', b: '#F97316', t: 'ค่ายวิทย์' }, { c: '#DCFCE7', b: '#22C55E', t: 'ซ้อมรับน้อง' }] },
                { d: 6,  events: [{ c: '#FED7AA', b: '#F97316', t: 'ค่ายวิทย์' }] },
                { d: 7,  events: [] },
                { d: 8,  events: [] },
                { d: 9,  events: [] },
                { d: 10, today: true, events: [{ c: '#F3E8FF', b: '#A855F7', t: 'วันวิทยาศาสตร์' }] },
                { d: 11, events: [] },
                { d: 12, events: [{ c: '#DCFCE7', b: '#22C55E', t: 'รับน้องปี 1' }] },
                { d: 13, events: [{ c: '#DCFCE7', b: '#22C55E', t: 'รับน้องปี 1' }] },
              ].map(({ d, dim, today, events }, i) => (
                <div key={i} className={`bg-white p-1.5 min-h-[68px] ${dim ? 'opacity-40' : ''}`}>
                  <div className="flex justify-end mb-1">
                    <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${today ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{d}</span>
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((ev: any, j: number) => (
                      <div key={j} className="rounded px-1 py-0.5 text-[9px] font-semibold truncate"
                        style={{ backgroundColor: ev.c, borderLeft: `2px solid ${ev.b}`, color: ev.b.replace('#', '#') }}>
                        {ev.t}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">ฟีเจอร์ทั้งหมด</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">ครบทุกความต้องการ<br className="hidden md:block"/> ของทีมงานสโมสรฯ</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => {
            const c = colorMap[f.color]
            return (
              <div key={f.title}
                className={`group p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white`}>
                <div className={`w-11 h-11 ${c.bg} ${c.icon} rounded-2xl flex items-center justify-center mb-4 ring-4 ${c.ring} ring-offset-0`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">วิธีการใช้งาน</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">เริ่มใช้ได้ใน 4 ขั้นตอน</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-blue-200 via-indigo-200 to-blue-200" />

            {steps.map((s, i) => (
              <div key={s.n} className="relative flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-2xl border-2 border-blue-200 flex flex-col items-center justify-center mb-4 shadow-sm relative z-10">
                  <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">{s.n}</span>
                  <span className="text-2xl font-black text-blue-600 leading-none">{['🔐','📁','📝','✅'][i]}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access control section ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-8 w-56 h-56 bg-white/5 rounded-full" />

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 text-xs font-semibold mb-4">
                <Shield size={12} /> ระบบสิทธิ์การเข้าถึง
              </div>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-4">
                เปิดใช้เฉพาะ<br />ทีมงานสโมสรฯ
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                ระบบอนุญาตเฉพาะรหัสนักศึกษาของทีมงานที่ลงทะเบียนไว้ แบ่งสิทธิ์เป็น <strong className="text-white">ทีมบริหาร</strong> และ <strong className="text-white">ทีมงาน</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { role: 'ทีมบริหาร', color: 'bg-white/20', icon: '👑', perms: ['สร้างกิจกรรม', 'แก้ไข / ลบ', 'นำเข้า CSV', 'บริหารโครงการ'] },
                { role: 'ทีมงาน', color: 'bg-white/10', icon: '👤', perms: ['ดูปฏิทิน', 'ดูโครงการ', 'Sync Calendar', 'ดูโปรไฟล์'] },
              ].map(r => (
                <div key={r.role} className={`${r.color} rounded-2xl p-4`}>
                  <div className="text-xl mb-1">{r.icon}</div>
                  <p className="text-sm font-bold mb-3">{r.role}</p>
                  <ul className="space-y-1.5">
                    {r.perms.map(p => (
                      <li key={p} className="flex items-center gap-1.5 text-xs text-blue-100">
                        <div className="w-1 h-1 rounded-full bg-blue-300 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="pb-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-4">🧪</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            พร้อมแล้ว?
          </h2>
          <p className="text-gray-500 mb-8 text-base">
            Login ด้วยบัญชี PSU LMS แล้วเริ่มจัดการโครงการได้เลย
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 text-base"
          >
            เข้าสู่ระบบด้วย PSU LMS <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="white" strokeWidth="2">
                <path d="M9 3h6M9 3v8L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-3L15 11V3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-600">Samo Schedule</span>
          </div>
          <p>© {new Date().getFullYear()} สโมสรนักศึกษาคณะวิทยาศาสตร์ มหาวิทยาลัยสงขลานครินทร์</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-blue-600 transition">เข้าสู่ระบบ</Link>
            <Link href="/calendar" className="hover:text-blue-600 transition">ปฏิทิน</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

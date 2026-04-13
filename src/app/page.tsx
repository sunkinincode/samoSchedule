import Link from 'next/link'
import {
  Calendar, ArrowRight, ChevronRight,
  RefreshCw, Bell, Shield, Sparkles, Atom
} from 'lucide-react'

// ─── Flow steps ───────────────────────────────────────────────────────────────
const steps = [
  { n: '01', title: 'Login ด้วย PSU LMS', desc: 'ใช้รหัสนักศึกษาและรหัสผ่าน LMS เดิม ไม่ต้องสมัครใหม่' },
  { n: '02', title: 'เลือกโครงการของคุณ', desc: 'ระบบดึงโครงการที่คุณเป็นผู้ดูแลมาแสดงอัตโนมัติ' },
  { n: '03', title: 'เพิ่มกิจกรรมและงาน', desc: 'สร้างวันงานจริง งานเตรียม หรือนำเข้าจาก CSV ได้เลย' },
  { n: '04', title: 'ทุกคนเห็นพร้อมกัน', desc: 'วันงานจริงปรากฏบนปฏิทินของทุกคนในสโมสรฯ ทันที' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Google Sans', 'Noto Sans Thai', sans-serif" }}>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-200 shadow-sm">
              <Atom size={22} className="text-amber-600" />
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
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl opacity-70" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-40 left-0 w-56 h-56 bg-cyan-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#1d4ed8 1px, transparent 1px), linear-gradient(90deg, #1d4ed8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-4xl mx-auto px-5 text-center">
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

            <div className="grid grid-cols-7 mb-1">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-1.5">{d}</div>
              ))}
            </div>

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

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">วิธีการใช้งาน</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">เริ่มใช้ได้ใน 4 ขั้นตอน</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
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
              <Atom className="w-3.5 h-3.5 text-white" />
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
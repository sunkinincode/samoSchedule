import Link from 'next/link'
import { Calendar, Users, LayoutDashboard, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
            Samo Schedule
          </span>
        </div>
        <Link 
          href="/login" 
          className="px-5 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          เข้าสู่ระบบ
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            จัดการกิจกรรมชมรม <br />
            <span className="text-blue-600">ให้เป็นเรื่องง่าย</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            ระบบบริหารจัดการโปรเจกต์และตารางกิจกรรมสำหรับนักศึกษา 
            เชื่อมต่อข้อมูลโดยตรงจาก PSU LMS เพื่อความสะดวกและรวดเร็ว
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
            >
              เริ่มต้นใช้งาน
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/calendar" 
              className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all"
            >
              ดูปฏิทินกิจกรรม
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Calendar size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">ระบบปฏิทิน</h3>
              <p className="text-gray-500 leading-relaxed">
                ติดตามทุกกิจกรรมของสโมสรและชมรม ไม่พลาดทุกวันสำคัญ พร้อมส่งออกไปยัง Google Calendar
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">จัดการทีม</h3>
              <p className="text-gray-500 leading-relaxed">
                แบ่งบทบาทสมาชิกในโปรเจกต์ต่างๆ ตั้งแต่สมาชิกทั่วไปจนถึงหัวหน้าโปรเจกต์
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <LayoutDashboard size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">แดชบอร์ดสรุปผล</h3>
              <p className="text-gray-500 leading-relaxed">
                เห็นภาพรวมการดำเนินงานของแต่ละโปรเจกต์ได้อย่างชัดเจนในหน้าเดียว
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-gray-400 text-sm">
        © 2024 Samo Schedule - พัฒนาเพื่อนักศึกษาโดยเฉพาะ
      </footer>
    </div>
  )
}
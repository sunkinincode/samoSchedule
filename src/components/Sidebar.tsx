'use client'
import { Calendar as CalendarIcon, FolderKanban, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react'
import Link from 'next/link'

interface SidebarProps {
  user: any
  activePage: 'calendar' | 'projects'
  onLogout: () => void
}

export default function Sidebar({ user, activePage, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen hidden md:flex shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <LayoutDashboard className="text-white" size={18} />
        </div>
        <span className="font-bold text-lg text-blue-800">Samo Schedule</span>
      </div>

      {/* User Profile */}
      <div className="p-6 flex flex-col items-center border-b border-gray-100">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-3 overflow-hidden border-4 border-white shadow-md">
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="avatar" />
            : <UserIcon size={40} className="text-blue-400" />
          }
        </div>
        <p className="font-bold text-gray-800 text-center truncate w-full px-2">
          {user?.user_metadata?.full_name || user?.user_metadata?.student_id || 'ผู้ใช้งาน'}
        </p>
        <p className="text-[10px] font-medium text-blue-500 mt-1 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full text-center">
          {user?.user_metadata?.department || 'สมาชิก'}
        </p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/calendar"
          className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${
            activePage === 'calendar'
              ? 'bg-blue-50 text-blue-700 font-bold pointer-events-none'
              : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
          }`}
        >
          <CalendarIcon size={20} />
          <span>ปฏิทินกิจกรรม</span>
        </Link>
        <Link
          href="/projects"
          className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${
            activePage === 'projects'
              ? 'bg-blue-50 text-blue-700 font-bold pointer-events-none'
              : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
          }`}
        >
          <FolderKanban size={20} />
          <span>โครงการของฉัน</span>
        </Link>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full p-3 text-red-500 hover:bg-red-50 rounded-xl transition font-medium"
        >
          <LogOut size={20} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}

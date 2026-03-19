'use client'
import { Calendar as CalendarIcon, FolderKanban } from 'lucide-react'
import Link from 'next/link'

interface MobileNavProps {
  activePage: 'calendar' | 'projects'
}

export default function MobileNav({ activePage }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 safe-area-bottom">
      <div className="flex justify-around items-center py-2 px-4">
        <Link
          href="/calendar"
          className={`flex flex-col items-center gap-1 px-8 py-2 rounded-2xl transition-all ${
            activePage === 'calendar' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <CalendarIcon size={22} strokeWidth={activePage === 'calendar' ? 2.5 : 2} />
          <span className={`text-[10px] font-semibold ${activePage === 'calendar' ? 'font-bold' : ''}`}>
            ปฏิทิน
          </span>
        </Link>

        <Link
          href="/projects"
          className={`flex flex-col items-center gap-1 px-8 py-2 rounded-2xl transition-all ${
            activePage === 'projects' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <FolderKanban size={22} strokeWidth={activePage === 'projects' ? 2.5 : 2} />
          <span className={`text-[10px] font-semibold ${activePage === 'projects' ? 'font-bold' : ''}`}>
            โครงการ
          </span>
        </Link>
      </div>
    </nav>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  FolderKanban, CalendarCheck, Users, Pin,
  ChevronRight, TrendingUp, Clock, MapPin, Search,
  CalendarDays, AlertTriangle,
} from 'lucide-react'
import { format, parseISO, differenceInDays, startOfDay, isAfter } from 'date-fns'
import { th } from 'date-fns/locale'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

// ── Countdown badge ────────────────────────────────────────────────────────────
function CountdownBadge({ startTime }: { startTime: string }) {
  const days = differenceInDays(startOfDay(parseISO(startTime)), startOfDay(new Date()))
  if (days < 0)   return <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ผ่านไปแล้ว</span>
  if (days === 0) return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">วันนี้!</span>
  if (days === 1) return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">พรุ่งนี้</span>
  if (days <= 7)  return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">อีก {days} วัน</span>
  return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">อีก {days} วัน</span>
}

// ── Category chip ──────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'ทั่วไป':          'bg-gray-100 text-gray-600',
  'วิชาการ':         'bg-blue-50 text-blue-700',
  'กีฬา':            'bg-emerald-50 text-emerald-700',
  'บำเพ็ญประโยชน์':  'bg-green-50 text-green-700',
  'ศิลปวัฒนธรรม':    'bg-purple-50 text-purple-700',
  'สัมมนา':          'bg-indigo-50 text-indigo-700',
  'อื่นๆ':           'bg-pink-50 text-pink-700',
}
function CategoryChip({ cat }: { cat?: string }) {
  const label = cat || 'ทั่วไป'
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${CAT_COLORS[label] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user, setUser]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({ projects: 0, events: 0, members: 0, pinned: 0 })
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [pinned, setPinned]     = useState<any[]>([])
  const [searchQ, setSearchQ]   = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [allEvents, setAllEvents] = useState<any[]>([])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return (window.location.href = '/login')
    setUser(user)

    const now = new Date().toISOString()

    const [
      { data: projects },
      { data: events },
      { data: members },
      { data: pinnedData },
      { data: upcomingData },
    ] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact' }),
      supabase.from('events').select('id', { count: 'exact' }).or('project_id.is.null,event_type.eq.main'),
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('events')
        .select('*, projects(name_th)')
        .eq('is_pinned', true)
        .eq('event_type', 'main')
        .order('start_time', { ascending: true }),
      supabase.from('events')
        .select('*, projects(name_th)')
        .or('project_id.is.null,event_type.eq.main')
        .gte('end_time', now)
        .order('start_time', { ascending: true })
        .limit(20),
    ])

    setStats({
      projects: projects?.length || 0,
      events:   events?.length   || 0,
      members:  members?.length  || 0,
      pinned:   pinnedData?.length || 0,
    })
    setPinned(pinnedData || [])
    setUpcoming(upcomingData || [])
    setAllEvents(upcomingData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Search ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults(null); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('events')
        .select('*, projects(name_th)')
        .or('project_id.is.null,event_type.eq.main')
        .ilike('title', `%${searchQ.trim()}%`)
        .order('start_time', { ascending: false })
        .limit(20)
      setSearchResults(data || [])
      setSearching(false)
    }, 350)
    return () => clearTimeout(timeout)
  }, [searchQ])

  const displayEvents = searchResults !== null ? searchResults
    : catFilter ? upcoming.filter(e => (e.category || 'ทั่วไป') === catFilter)
    : upcoming

  const CATEGORIES = ['ทั่วไป', 'วิชาการ', 'กีฬา', 'บำเพ็ญประโยชน์', 'ศิลปวัฒนธรรม', 'สัมมนา', 'อื่นๆ']

  const statCards = [
    { label: 'โครงการทั้งหมด', value: stats.projects, icon: <FolderKanban size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'กิจกรรมปีนี้',    value: stats.events,   icon: <CalendarCheck size={20} />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'ทีมงาน',          value: stats.members,  icon: <Users size={20} />, color: 'text-purple-600 bg-purple-50' },
    { label: 'ปักหมุดอยู่',     value: stats.pinned,   icon: <Pin size={20} />,  color: 'text-orange-600 bg-orange-50' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar user={user} activePage="dashboard" onLogout={handleLogout}
        onUserUpdated={async () => { const { data: { user } } = await supabase.auth.getUser(); if(user) setUser(user) }} />
      <MobileNav activePage="dashboard" user={user}
        onUserUpdated={async () => { const { data: { user } } = await supabase.auth.getUser(); if(user) setUser(user) }} />

      <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={26} /> Dashboard
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                สโมสรนักศึกษาคณะวิทยาศาสตร์ · {format(new Date(), 'd MMMM yyyy', { locale: th })}
              </p>
            </div>
            <Link href="/calendar"
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 transition">
              ปฏิทิน <ChevronRight size={13} />
            </Link>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Stat cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                      {s.icon}
                    </div>
                    <p className="text-2xl font-black text-gray-900">{s.value}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Pinned events ── */}
              {pinned.length > 0 && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-2">
                    <Pin size={12} /> กิจกรรมที่ปักหมุด
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pinned.map(e => (
                      <div key={e.id} className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                          <Pin size={16} className="text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-gray-900 truncate">{e.title}</h3>
                            <CategoryChip cat={e.category} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(parseISO(e.start_time), 'd MMM yyyy', { locale: th })}
                            {e.projects?.name_th && ` · ${e.projects.name_th}`}
                          </p>
                          {e.location && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                              <MapPin size={10} /> {e.location}
                            </p>
                          )}
                        </div>
                        <CountdownBadge startTime={e.start_time} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Search + Filter + Events ── */}
              <div>
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h2 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                    <CalendarDays size={12} /> กิจกรรมที่กำลังจะมาถึง
                  </h2>
                  <Link href="/calendar" className="text-xs font-bold text-blue-500 hover:underline">
                    ดูทั้งหมด →
                  </Link>
                </div>

                {/* Search bar */}
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหากิจกรรม..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Category filter chips */}
                {!searchQ && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    <button onClick={() => setCatFilter(null)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border transition ${!catFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                      ทั้งหมด
                    </button>
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border transition ${catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Events list */}
                {displayEvents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CalendarCheck size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      {searchQ ? 'ไม่พบกิจกรรมที่ค้นหา' : 'ไม่มีกิจกรรมที่กำลังจะมาถึง'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayEvents.map(e => {
                      const links: any[] = e.links || []
                      return (
                        <div key={e.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                              {e.is_pinned
                                ? <Pin size={15} className="text-orange-500" />
                                : <CalendarCheck size={15} className="text-blue-500" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <h3 className="font-bold text-sm text-gray-900">{e.title}</h3>
                                <CategoryChip cat={e.category} />
                                {e.is_pinned && (
                                  <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">ปักหมุด</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {format(parseISO(e.start_time), 'd MMM yyyy · HH:mm', { locale: th })} น.
                                {e.projects?.name_th && <span className="ml-1 text-blue-400">· {e.projects.name_th}</span>}
                              </p>
                              {e.location && (
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                                  <MapPin size={10} /> {e.location}
                                </p>
                              )}
                              {links.length > 0 && (
                                <div className="flex gap-2 mt-1.5 flex-wrap">
                                  {links.map((l: any, i: number) => (
                                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition flex items-center gap-1">
                                      🔗 {l.label || 'ลิงก์'}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <CountdownBadge startTime={e.start_time} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

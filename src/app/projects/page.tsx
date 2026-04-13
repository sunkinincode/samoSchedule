'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  FolderKanban, User as UserIcon,
  ChevronRight, X, Clock, Trash2, Edit,
  CalendarDays, CalendarClock, CalendarRange, CalendarX2,
  ListTodo, CalendarCheck, Users, Building2, BadgeCheck,
  ArrowLeft,
} from 'lucide-react'
import { format, parseISO, isSameDay } from 'date-fns'
import { th } from 'date-fns/locale'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import SchedulePicker, {
  ScheduleState, EMPTY_SCHEDULE, buildEventRows, eventToSchedule,
} from '@/components/SchedulePicker'

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType = 'task' | 'main'

type DateSummary =
  | { type: 'none' }
  | { type: 'single-day';       date: string; time: string }
  | { type: 'multi-day-span';   range: string; note: string }
  | { type: 'multi-session';    date: string; count: number }
  | { type: 'multi-day-events'; range: string; days: number }

// ─── Date summary ─────────────────────────────────────────────────────────────
function getProjectDateSummary(events: any[]): DateSummary {
  const mainEvents = (events || []).filter(e => e.event_type === 'main' || !e.event_type)
  if (mainEvents.length === 0) return { type: 'none' }
  const sorted = [...mainEvents].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  const first   = parseISO(sorted[0].start_time)
  const lastEnd = parseISO(sorted[sorted.length - 1].end_time)
  const shortDate = (d: Date) => format(d, 'd MMM yy', { locale: th })
  const sameMonth = (a: Date, b: Date) => format(a, 'MMMyyyy') === format(b, 'MMMyyyy')

  if (sorted.length === 1) {
    const end = parseISO(sorted[0].end_time)
    if (isSameDay(first, end))
      return { type: 'single-day', date: shortDate(first), time: `${format(first, 'HH:mm')}–${format(end, 'HH:mm')} น.` }
    const range = sameMonth(first, end)
      ? `${format(first, 'd')}–${format(end, 'd MMM yy', { locale: th })}`
      : `${format(first, 'd MMM', { locale: th })} – ${shortDate(end)}`
    return { type: 'multi-day-span', range, note: `${Math.round((end.getTime() - first.getTime()) / 86400000) + 1} วัน` }
  }
  const uniqueDays = [...new Set(sorted.map(e => format(parseISO(e.start_time), 'yyyy-MM-dd')))]
  if (uniqueDays.length === 1)
    return { type: 'multi-session', date: shortDate(first), count: sorted.length }
  const range = sameMonth(first, lastEnd)
    ? `${format(first, 'd')}–${format(lastEnd, 'd MMM yy', { locale: th })}`
    : `${format(first, 'd MMM', { locale: th })} – ${shortDate(lastEnd)}`
  return { type: 'multi-day-events', range, days: uniqueDays.length }
}

// ─── Date badge ───────────────────────────────────────────────────────────────
function DateBadge({ summary, color }: { summary: DateSummary; color: 'orange' | 'blue' }) {
  const base  = color === 'orange' ? 'text-orange-700 bg-orange-100/80' : 'text-blue-700 bg-blue-100/80'
  const muted = color === 'orange' ? 'text-orange-500' : 'text-blue-500'
  if (summary.type === 'none') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 mt-1.5">
      <CalendarX2 size={11} /> ยังไม่มีกำหนดการ
    </span>
  )
  if (summary.type === 'single-day') return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1.5 ${base}`}>
      <CalendarDays size={10} />{summary.date}
      <span className={`font-normal ${muted}`}>{summary.time}</span>
    </span>
  )
  if (summary.type === 'multi-day-span') return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1.5 ${base}`}>
      <CalendarRange size={10} />{summary.range}
      <span className={`font-normal ${muted}`}>· {summary.note}</span>
    </span>
  )
  if (summary.type === 'multi-session') return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1.5 ${base}`}>
      <CalendarClock size={10} />{summary.date}
      <span className={`font-normal ${muted}`}>· {summary.count} กิจกรรม</span>
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1.5 ${base}`}>
      <CalendarRange size={10} />{summary.range}
      <span className={`font-normal ${muted}`}>· {summary.days} วัน</span>
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 'md', onClick }: {
  user: any; size?: 'sm' | 'md' | 'lg'; onClick?: () => void
}) {
  const s = { sm: 'w-9 h-9', md: 'w-12 h-12', lg: 'w-20 h-20' }[size]
  const i = { sm: 16, md: 20, lg: 36 }[size]
  return (
    <div
      onClick={onClick}
      className={`${s} rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm shrink-0 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all' : ''}`}
    >
      {user?.avatar_url
        ? <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.full_name} />
        : <UserIcon size={i} className="text-gray-400 m-auto mt-[20%]" />
      }
    </div>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
      <BadgeCheck size={10} /> ทีมบริหาร
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
      <Users size={10} /> ทีมงาน
    </span>
  )
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ manager, onClose }: {
  manager: any
  onClose: () => void
}) {
  const [theirProjects, setTheirProjects] = useState<any[]>([])
  const [theirEvents, setTheirEvents] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function fetchManagerData() {
      setLoading(true)
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .ilike('manager_id', `%${manager.student_id}%`)
        .order('created_at', { ascending: false })

      if (!isMounted) return
      const fetchedProjects = projects || []
      setTheirProjects(fetchedProjects)

      if (fetchedProjects.length > 0) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, project_id, start_time, end_time, title, event_type')
          .in('project_id', fetchedProjects.map(p => p.id))

        if (!isMounted) return
        const map: Record<string, any[]> = {}
        for (const ev of eventsData || []) {
          if (!map[ev.project_id]) map[ev.project_id] = []
          map[ev.project_id].push(ev)
        }
        setTheirEvents(map)
      } else {
        setTheirEvents({})
      }
      setLoading(false)
    }

    if (manager?.student_id) {
      fetchManagerData()
    } else {
      setLoading(false)
    }

    return () => { isMounted = false }
  }, [manager])

  return (
    <div
      className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 sm:hidden" />

        {/* Header */}
        <div className="relative bg-gradient-to-b from-blue-50 to-white px-6 pt-5 pb-4">
          <button onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-white/80 text-gray-500 rounded-full hover:bg-white transition shadow-sm">
            <X size={16} />
          </button>

          <div className="flex items-center gap-4 mt-1">
            <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden shadow-md border-2 border-white shrink-0">
              {manager.avatar_url
                ? <img src={manager.avatar_url} className="w-full h-full object-cover" alt="" />
                : <UserIcon size={36} className="text-gray-300 m-auto mt-4" />
              }
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
                {manager.full_name || manager.student_id}
              </h2>
              {manager.student_id && (
                <p className="text-xs text-gray-400 font-medium mt-0.5">{manager.student_id}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <RoleBadge role={manager.role} />
              </div>
            </div>
          </div>
        </div>

        {/* Department */}
        {manager.department && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Building2 size={15} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">ฝ่าย / ตำแหน่ง</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{manager.department}</p>
            </div>
          </div>
        )}

        {/* Projects */}
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
            <FolderKanban size={11} />
            ดูแลโครงการ {loading ? '' : `(${theirProjects.length})`}
          </p>

          {loading ? (
             <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
             </div>
          ) : theirProjects.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูลโครงการ</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {theirProjects.map(p => {
                const summary = getProjectDateSummary(theirEvents[p.id] || [])
                const isDeeden = p.type === 'ดีเด่น'
                return (
                  <div key={p.id}
                    className={`rounded-xl p-3 border flex items-start gap-2.5 ${isDeeden ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${isDeeden ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                      {p.type}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-snug ${isDeeden ? 'text-orange-900' : 'text-blue-900'}`}>
                        {p.name_th}
                      </p>
                      {summary.type !== 'none' && (
                        <DateBadge summary={summary} color={isDeeden ? 'orange' : 'blue'} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Managers Section (inside project detail panel) ───────────────────────────
function ManagersSection({ project, allUsers, currentUser }: {
  project: any
  allUsers: any[]
  currentUser: any
}) {
  const [selectedManager, setSelectedManager] = useState<any | null>(null)
  const [expanded, setExpanded] = useState(false)

  const managerIds: string[] = project.manager_id
    ? project.manager_id.split(',').map((s: string) => s.trim())
    : []
  const managers = managerIds
    .map(id => allUsers.find((u: any) => u.student_id === id))
    .filter(Boolean)

  // Put current user first
  const me      = managers.find((m: any) => m.student_id === currentUser?.user_metadata?.student_id)
  const others  = managers.filter((m: any) => m.student_id !== currentUser?.user_metadata?.student_id)
  const sorted  = me ? [me, ...others] : managers

  const FOLD = 8   // show up to 8 before "expand"
  const shown = expanded ? sorted : sorted.slice(0, FOLD)
  const extra = sorted.length - FOLD

  return (
    <>
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
            <Users size={11} /> ผู้ดูแลโครงการ
            <span className="font-normal text-gray-400 normal-case tracking-normal">({sorted.length} คน)</span>
          </p>
          {extra > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              {expanded ? 'ย่อลง' : `ดูทั้งหมด +${extra}`}
            </button>
          )}
        </div>

        {/* Grid — compact (≤8) or expanded */}
        {sorted.length <= 6 ? (
          // ── Row layout for small teams ──
          <div className="flex flex-wrap gap-2">
            {shown.map((mgr: any) => (
              <ManagerChip
                key={mgr.student_id} manager={mgr}
                isMe={mgr.student_id === currentUser?.user_metadata?.student_id}
                onClick={() => setSelectedManager(mgr)}
              />
            ))}
          </div>
        ) : (
          // ── Grid layout for larger teams ──
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {shown.map((mgr: any) => (
              <ManagerGridCell
                key={mgr.student_id} manager={mgr}
                isMe={mgr.student_id === currentUser?.user_metadata?.student_id}
                onClick={() => setSelectedManager(mgr)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedManager && (
        <ProfileModal
          manager={selectedManager}
          onClose={() => setSelectedManager(null)}
        />
      )}
    </>
  )
}

// ── Chip: compact inline card ─────────────────────────────────────────────────
function ManagerChip({ manager, isMe, onClick }: { manager: any; isMe: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition hover:shadow-sm active:scale-[0.98] ${
        isMe ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-white shadow-sm">
        {manager.avatar_url
          ? <img src={manager.avatar_url} className="w-full h-full object-cover" alt="" />
          : <UserIcon size={14} className="text-gray-400 m-auto mt-1.5" />
        }
      </div>
      <div className="text-left min-w-0">
        <p className={`text-[11px] font-bold truncate max-w-[80px] ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
          {manager.full_name?.split(' ')[0] || manager.student_id}
        </p>
        <p className="text-[9px] text-gray-400 truncate max-w-[80px] leading-tight">{manager.department}</p>
      </div>
    </button>
  )
}

// ── Grid cell: square avatar + name below ─────────────────────────────────────
function ManagerGridCell({ manager, isMe, onClick }: { manager: any; isMe: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition hover:shadow-sm active:scale-[0.97] ${
        isMe ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : 'bg-white border-gray-100 hover:border-gray-300'
      }`}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border-2 border-white shadow-sm">
        {manager.avatar_url
          ? <img src={manager.avatar_url} className="w-full h-full object-cover" alt="" />
          : <UserIcon size={22} className="text-gray-300 m-auto mt-2" />
        }
      </div>
      <div className="w-full text-center">
        <p className={`text-[10px] font-bold truncate leading-tight ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
          {manager.full_name?.split(' ')[0] || manager.student_id}
        </p>
        <p className="text-[8px] text-gray-400 truncate leading-tight">{manager.department?.replace('ประธานฝ่าย', '').replace('อุปนายกฝ่าย', '') || ''}</p>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects]     = useState<any[]>([])
  const [allUsers, setAllUsers]     = useState<any[]>([])
  const [tileEvents, setTileEvents] = useState<Record<string, any[]>>({})
  const [loading, setLoading]       = useState(true)
  const [user, setUser]             = useState<any>(null)

  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [projectEvents, setProjectEvents]     = useState<any[]>([])

  // Modal state
  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalType, setModalType]       = useState<EventType>('task')
  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [location, setLocation]         = useState('')
  const [schedule, setSchedule]         = useState<ScheduleState>(EMPTY_SCHEDULE)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return (window.location.href = '/login')
    setUser(user)

    const [{ data: usersData }, { data: projectData }] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('projects')
        .select('*')
        .ilike('manager_id', `%${user.user_metadata?.student_id}%`)
        .order('created_at', { ascending: false }),
    ])
    setAllUsers(usersData || [])
    const projects = projectData || []
    setProjects(projects)

    if (projects.length > 0) {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, project_id, start_time, end_time, title, event_type')
        .in('project_id', projects.map(p => p.id))
      const map: Record<string, any[]> = {}
      for (const ev of eventsData || []) {
        if (!map[ev.project_id]) map[ev.project_id] = []
        map[ev.project_id].push(ev)
      }
      setTileEvents(map)
    }
    setLoading(false)
  }

  const fetchProjectEvents = async (projectId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, users(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('start_time', { ascending: true })
    if (error) console.error('โหลดกิจกรรมไม่สำเร็จ:', error)
    const rows = data || []
    setProjectEvents(rows)
    setTileEvents(prev => ({ ...prev, [projectId]: rows }))
  }

  const handleOpenProject = (project: any) => {
    setSelectedProject(project)
    fetchProjectEvents(project.id)
  }

  const openAddModal = (type: EventType) => {
    setEditingEvent(null); setModalType(type)
    setTitle(''); setDescription(''); setLocation('')
    setSchedule(EMPTY_SCHEDULE); setIsModalOpen(true)
  }

  const openEditModal = (event: any) => {
    setEditingEvent(event)
    setModalType(event.event_type === 'main' ? 'main' : 'task')
    setTitle(event.title); setDescription(event.description || '')
    setLocation(event.location || ''); setSchedule(eventToSchedule(event))
    setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setEditingEvent(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedule.date) return alert('กรุณาเลือกวันที่')
    setIsSubmitting(true)
    try {
      const base = {
        title, description, location,
        event_type: modalType, created_by: user.id,
        project_id: selectedProject.id,
      }
      if (editingEvent) {
        const rows = buildEventRows(schedule, base)
        const { error } = await supabase.from('events').update(rows[0]).eq('id', editingEvent.id)
        if (error) throw error
      } else {
        const rows = buildEventRows(schedule, base)
        const { error } = await supabase.from('events').insert(rows)
        if (error) throw error
      }
      closeModal(); fetchProjectEvents(selectedProject.id)
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return
    await supabase.from('events').delete().eq('id', eventId)
    fetchProjectEvents(selectedProject.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const outstandingProjects  = projects.filter(p => p.type === 'ดีเด่น')
  const organizationProjects = projects.filter(p => p.type === 'องค์การ')
  const mainEvents = projectEvents.filter(e => e.event_type === 'main' || !e.event_type)
  const taskEvents = projectEvents.filter(e => e.event_type === 'task')
  const modalTitle = editingEvent
    ? (modalType === 'main' ? 'แก้ไขวันงานจริง' : 'แก้ไขงานเตรียม')
    : (modalType === 'main' ? 'เพิ่มวันงานจริง'  : 'เพิ่มงานเตรียม')

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar user={user} activePage="projects" onLogout={handleLogout}
        onUserUpdated={async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) setUser(user)
        }}
      />
      <MobileNav activePage="projects" />

      <main className="flex-1 overflow-y-auto w-full relative pb-20 md:pb-0">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-10">
          <h1 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
            <FolderKanban className="text-blue-600" size={28} /> โครงการที่ฉันดูแล
          </h1>
        </header>

        <div className="p-4 md:p-8 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">ไม่มีโครงการที่คุณดูแล</p>
            </div>
          ) : (
            <>
              {outstandingProjects.length > 0 && (
                <section>
                  <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                    โครงการดีเด่น ({outstandingProjects.length})
                  </h2>
                  <div className="space-y-3">
                    {outstandingProjects.map(p => (
                      <ProjectTile key={p.id} project={p} color="orange"
                        allUsers={allUsers} user={user} events={tileEvents[p.id] || []}
                        onClick={() => handleOpenProject(p)} />
                    ))}
                  </div>
                </section>
              )}
              {organizationProjects.length > 0 && (
                <section>
                  <h2 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    โครงการองค์การ ({organizationProjects.length})
                  </h2>
                  <div className="space-y-3">
                    {organizationProjects.map(p => (
                      <ProjectTile key={p.id} project={p} color="blue"
                        allUsers={allUsers} user={user} events={tileEvents[p.id] || []}
                        onClick={() => handleOpenProject(p)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* ── Project Detail Panel ─────────────────────────────────────── */}
        {selectedProject && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="bg-white w-full md:max-w-4xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              style={{ maxHeight: '92vh' }}>

              {/* Panel header */}
              <div className={`p-5 md:p-7 flex justify-between items-start shrink-0 ${selectedProject.type === 'ดีเด่น' ? 'bg-orange-50 border-b border-orange-100' : 'bg-blue-50 border-b border-blue-100'}`}>
                <div>
                  <span className={`inline-block text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full mb-2 ${selectedProject.type === 'ดีเด่น' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                    {selectedProject.type}
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{selectedProject.name_th}</h2>
                  {selectedProject.name_en && <p className="text-xs font-semibold text-gray-500 mt-1">{selectedProject.name_en}</p>}
                </div>
                <button onClick={() => setSelectedProject(null)} className="p-2 bg-white/60 hover:bg-white rounded-full transition shrink-0">
                  <X size={20} />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6 bg-white">

                {/* ── Managers Section (Full Width) ────────────────────── */}
                <div className="w-full">
                  <ManagersSection
                    project={selectedProject}
                    allUsers={allUsers}
                    currentUser={user}
                  />
                </div>

                {/* ── Events ───────────────────────────────────────────── */}
                <div className="space-y-5">
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => openAddModal('task')}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-xs font-bold transition">
                      <ListTodo size={14} className="text-gray-500" /> เพิ่มงานเตรียม
                    </button>
                    <button onClick={() => openAddModal('main')}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 px-3 py-2.5 rounded-xl text-xs font-bold transition">
                      <CalendarCheck size={14} /> เพิ่มวันงานจริง
                    </button>
                  </div>

                  {/* Main events */}
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                      <CalendarCheck size={12} /> วันงานจริง
                      <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal text-[10px]">แสดงในปฏิทินทุกคน</span>
                    </h3>
                    {mainEvents.length === 0 ? (
                      <div className="text-center py-6 bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200">
                        <p className="text-xs text-gray-400">ยังไม่มีวันงานจริง</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mainEvents.map(event => (
                          <EventRow key={event.id} event={event} type="main"
                            onEdit={() => openEditModal(event)} onDelete={() => handleDelete(event.id)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Task events */}
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5">
                      <ListTodo size={12} /> งานเตรียม
                      <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal text-[10px]">เห็นเฉพาะในโครงการ</span>
                    </h3>
                    {taskEvents.length === 0 ? (
                      <div className="text-center py-6 bg-amber-50/40 rounded-2xl border border-dashed border-amber-200">
                        <p className="text-xs text-gray-400">ยังไม่มีงานเตรียม</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {taskEvents.map(event => (
                          <EventRow key={event.id} event={event} type="task"
                            onEdit={() => openEditModal(event)} onDelete={() => handleDelete(event.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeModal}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>
              <div className={`px-6 pt-5 pb-4 shrink-0 ${modalType === 'main' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-amber-50 border-b border-amber-100'}`}>
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {modalType === 'main' ? <CalendarCheck size={20} className="text-emerald-600" /> : <ListTodo size={20} className="text-amber-600" />}
                    <h2 className="text-lg font-bold text-gray-800">{modalTitle}</h2>
                  </div>
                  <button onClick={closeModal} className="p-1.5 bg-white/70 text-gray-500 rounded-full hover:bg-white transition">
                    <X size={18} />
                  </button>
                </div>
                <p className={`text-[11px] rounded-lg px-3 py-2 mt-3 font-medium flex items-center gap-1.5 ${modalType === 'main' ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'}`}>
                  {modalType === 'main'
                    ? <><CalendarCheck size={12} /> กิจกรรมนี้จะแสดงในปฏิทินของทุกคนในองค์การ</>
                    : <><ListTodo size={12} /> งานเตรียมจะเห็นเฉพาะผู้ดูแลโครงการนี้เท่านั้น</>
                  }
                </p>
              </div>

              {!editingEvent && (
                <div className="px-6 pt-4 flex gap-2 shrink-0">
                  <button type="button" onClick={() => setModalType('task')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${modalType === 'task' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <ListTodo size={13} /> งานเตรียม
                  </button>
                  <button type="button" onClick={() => setModalType('main')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${modalType === 'main' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <CalendarCheck size={13} /> วันงานจริง
                  </button>
                </div>
              )}

              <div className="overflow-y-auto flex-1">
                <form id="event-form" onSubmit={handleSave} className="p-6 space-y-4">
                  <input type="text" required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={title} onChange={e => setTitle(e.target.value)}
                    placeholder={modalType === 'main' ? 'ชื่อกิจกรรม / วันงาน *' : 'ชื่องาน / สิ่งที่ต้องเตรียม *'}
                  />
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">กำหนดการ</p>
                    {editingEvent
                      ? <SchedulePicker value={{ ...schedule, mode: 'single' }} onChange={v => setSchedule({ ...v, mode: 'single' })} singleModeOnly />
                      : <SchedulePicker value={schedule} onChange={setSchedule} />
                    }
                  </div>
                  <input type="text"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={location} onChange={e => setLocation(e.target.value)} placeholder="สถานที่" />
                  <textarea rows={2}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={description} onChange={e => setDescription(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
                </form>
              </div>

              <div className="px-6 pb-6 shrink-0">
                <button form="event-form" type="submit" disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-xl font-bold text-white transition disabled:opacity-60 active:scale-[0.99] ${modalType === 'main' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                  {isSubmitting ? 'กำลังบันทึก...' : (editingEvent ? 'บันทึกการแก้ไข' : 'บันทึก')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── EventRow ─────────────────────────────────────────────────────────────────
function EventRow({ event, type, onEdit, onDelete }: {
  event: any; type: 'main' | 'task'; onEdit: () => void; onDelete: () => void
}) {
  const isMain = type === 'main'
  const start  = parseISO(event.start_time)
  const end    = parseISO(event.end_time)
  const isAlld = format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '23:59'
  return (
    <div className={`p-3.5 rounded-2xl border shadow-sm flex items-start gap-3 group relative transition ${isMain ? 'bg-white border-emerald-100 hover:border-emerald-300' : 'bg-white border-amber-100 hover:border-amber-300'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isMain ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {isMain ? <CalendarCheck size={15} className="text-emerald-500" /> : <Clock size={15} className="text-amber-500" />}
      </div>
      <div className="flex-1 min-w-0 pr-16">
        <h4 className="font-bold text-sm text-gray-900 truncate">{event.title}</h4>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {isSameDay(start, end)
            ? `${format(start, 'd MMM yyyy', { locale: th })}${isAlld ? ' · ทั้งวัน' : ` · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')} น.`}`
            : isAlld
              ? `${format(start, 'd MMM', { locale: th })}–${format(end, 'd MMM yyyy', { locale: th })} · ทั้งวัน`
              : `${format(start, 'd MMM yyyy HH:mm', { locale: th })} – ${format(end, 'd MMM yyyy HH:mm', { locale: th })}`
          }
        </p>
        {event.location && <p className="text-[10px] text-gray-400 mt-0.5 truncate">📍 {event.location}</p>}
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
          <Edit size={13} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── ProjectTile ──────────────────────────────────────────────────────────────
function ProjectTile({ project, color, allUsers, events, onClick, user }: {
  project: any; color: 'orange' | 'blue'; allUsers: any[]
  events: any[]; onClick: () => void; user: any
}) {
  const managerIds = project.manager_id ? project.manager_id.split(',').map((id: string) => id.trim()) : []
  const managers   = managerIds.map((id: string) => allUsers.find((u: any) => u.student_id === id)).filter(Boolean)
  const me         = managers.find((m: any) => m.student_id === user?.user_metadata?.student_id)
  const sorted     = me ? [me, ...managers.filter((m: any) => m.student_id !== user?.user_metadata?.student_id)] : managers

  const MAX = 5
  const display      = sorted.slice(0, MAX)
  const remainingCount = sorted.length - MAX
  const dateSummary  = getProjectDateSummary(events)

  const theme      = { orange: 'bg-orange-50/60 border-orange-200 hover:border-orange-400', blue: 'bg-blue-50/60 border-blue-200 hover:border-blue-400' }
  const textColor  = { orange: 'text-orange-900', blue: 'text-blue-900' }
  const badgeColor = { orange: 'bg-orange-100 text-orange-700', blue: 'bg-blue-100 text-blue-700' }

  return (
    <div onClick={onClick} className={`rounded-2xl p-4 md:p-5 shadow-sm border hover:shadow-md transition-all cursor-pointer group ${theme[color]}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md mb-1.5 ${badgeColor[color]}`}>
            {project.type}
          </span>
          <h3 className={`text-base font-bold leading-snug ${textColor[color]}`}>{project.name_th}</h3>
          {project.name_en && <p className={`text-xs font-semibold mt-0.5 opacity-55 truncate ${textColor[color]}`}>{project.name_en}</p>}
          <DateBadge summary={dateSummary} color={color} />
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <div className="flex -space-x-2.5">
            {display.map((mgr: any, idx: number) => (
              <div key={idx} title={mgr.full_name || mgr.student_id}
                className="w-9 h-9 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm relative hover:z-10 transition-transform hover:scale-110">
                {mgr.avatar_url ? <img src={mgr.avatar_url} className="w-full h-full object-cover" alt="" /> : <UserIcon size={18} className="text-gray-400 m-auto mt-1.5" />}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm relative z-10">
                +{remainingCount}
              </div>
            )}
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-full bg-white/80 text-gray-400 shadow-sm items-center justify-center group-hover:text-blue-600 group-hover:bg-white transition-all">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </div>
  )
}
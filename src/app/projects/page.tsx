'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  FolderKanban, User as UserIcon, QrCode,
  ChevronRight, X, Clock, Trash2, Edit,
  CalendarDays, CalendarClock, CalendarRange, CalendarX2,
  ListTodo, CalendarCheck, Sun,
} from 'lucide-react'
import {
  format, parseISO, isSameDay, addDays,
  eachDayOfInterval, parseISO as dateParse,
} from 'date-fns'
import { th } from 'date-fns/locale'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType    = 'task' | 'main'
type ScheduleMode = 'single' | 'multi-session' | 'allday'

interface ScheduleState {
  mode:       ScheduleMode
  date:       string   // single / multi-session: first date
  endDate:    string   // multi-session / allday: last date
  startTime:  string
  endTime:    string
  allDay:     boolean  // allday mode: no time required
}

const EMPTY_SCHEDULE: ScheduleState = {
  mode: 'single', date: '', endDate: '',
  startTime: '', endTime: '', allDay: false,
}

type DateSummary =
  | { type: 'none' }
  | { type: 'single-day';       date: string; time: string }
  | { type: 'multi-day-span';   range: string; note: string }
  | { type: 'multi-session';    date: string; count: number }
  | { type: 'multi-day-events'; range: string; days: number }

// ─── Date summary helper ──────────────────────────────────────────────────────
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
    if (isSameDay(first, end)) {
      return { type: 'single-day', date: shortDate(first), time: `${format(first, 'HH:mm')}–${format(end, 'HH:mm')} น.` }
    }
    const range = sameMonth(first, end)
      ? `${format(first, 'd')}–${format(end, 'd MMM yy', { locale: th })}`
      : `${format(first, 'd MMM', { locale: th })} – ${shortDate(end)}`
    return { type: 'multi-day-span', range, note: `${Math.round((end.getTime() - first.getTime()) / 86400000) + 1} วัน` }
  }

  const uniqueDays = [...new Set(sorted.map(e => format(parseISO(e.start_time), 'yyyy-MM-dd')))]
  if (uniqueDays.length === 1) {
    return { type: 'multi-session', date: shortDate(first), count: sorted.length }
  }
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

// ─── Schedule Picker ──────────────────────────────────────────────────────────
function SchedulePicker({ value, onChange }: {
  value: ScheduleState
  onChange: (v: ScheduleState) => void
}) {
  const set = (patch: Partial<ScheduleState>) => onChange({ ...value, ...patch })

  // Preview: how many events will be created and what they look like
  const preview = useMemo(() => {
    if (value.mode === 'single') {
      if (!value.date) return null
      const d = format(parseISO(value.date), 'd MMM yyyy', { locale: th })
      if (value.startTime && value.endTime) return `${d} · ${value.startTime}–${value.endTime} น.`
      return d
    }
    if (value.mode === 'multi-session') {
      if (!value.date || !value.endDate) return null
      const start = parseISO(value.date)
      const end   = parseISO(value.endDate)
      if (end < start) return null
      const days = eachDayOfInterval({ start, end })
      const time = (value.startTime && value.endTime) ? ` · ${value.startTime}–${value.endTime} น.` : ''
      return `${days.length} วัน${time} (สร้าง ${days.length} กิจกรรม)`
    }
    if (value.mode === 'allday') {
      if (!value.date) return null
      const start = parseISO(value.date)
      const end   = value.endDate ? parseISO(value.endDate) : start
      const days  = eachDayOfInterval({ start, end: end < start ? start : end }).length
      if (days === 1) return `${format(start, 'd MMM yyyy', { locale: th })} ทั้งวัน`
      return `${format(start, 'd MMM', { locale: th })}–${format(end < start ? start : end, 'd MMM yyyy', { locale: th })} (${days} วัน)`
    }
    return null
  }, [value])

  const modeBtn = (mode: ScheduleMode, icon: React.ReactNode, label: string, sub: string) => (
    <button
      type="button"
      onClick={() => set({ mode })}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition ${
        value.mode === mode
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      <span className="text-[16px]">{icon}</span>
      <span className="text-[11px] font-bold leading-tight">{label}</span>
      <span className={`text-[9px] leading-tight ${value.mode === mode ? 'text-blue-100' : 'text-gray-400'}`}>{sub}</span>
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex gap-2">
        {modeBtn('single',        <CalendarDays size={16} />,  'วันเดียว',         'มีหรือไม่มีเวลาก็ได้')}
        {modeBtn('multi-session', <CalendarClock size={16} />, 'หลายวัน วันละครั้ง', 'เวลาเดิมทุกวัน')}
        {modeBtn('allday',        <Sun size={16} />,           'ทั้งวัน',           'ไม่ระบุเวลา')}
      </div>

      {/* ── single mode ─────────────────────────────────────── */}
      {value.mode === 'single' && (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase pl-0.5">วันที่จัด</label>
            <input type="date"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={value.date} onChange={e => set({ date: e.target.value })} required />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase shrink-0">เวลา</label>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input type="time" placeholder="เริ่ม"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.startTime} onChange={e => set({ startTime: e.target.value })} />
              <input type="time" placeholder="สิ้นสุด"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.endTime} onChange={e => set({ endTime: e.target.value })} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 pl-0.5">เว้นว่างเวลาได้ถ้ายังไม่ทราบ</p>
        </div>
      )}

      {/* ── multi-session mode ──────────────────────────────── */}
      {value.mode === 'multi-session' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase pl-0.5">วันเริ่มต้น</label>
              <input type="date"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.date} onChange={e => set({ date: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase pl-0.5">วันสุดท้าย</label>
              <input type="date"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.endDate}
                min={value.date}
                onChange={e => set({ endDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase pl-0.5 block mb-1">เวลาแต่ละวัน (เหมือนกันทุกวัน)</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="time"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.startTime} onChange={e => set({ startTime: e.target.value })} required />
              <input type="time"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.endTime} onChange={e => set({ endTime: e.target.value })} required />
            </div>
          </div>
          {/* Day chips preview */}
          {value.date && value.endDate && parseISO(value.endDate) >= parseISO(value.date) && (() => {
            const days = eachDayOfInterval({ start: parseISO(value.date), end: parseISO(value.endDate) })
            return (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {days.map(d => (
                  <span key={d.toISOString()} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                    {format(d, 'EEEEEE d MMM', { locale: th })}
                  </span>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── allday mode ──────────────────────────────────────── */}
      {value.mode === 'allday' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase pl-0.5">วันเริ่มต้น</label>
              <input type="date"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.date} onChange={e => set({ date: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase pl-0.5">วันสุดท้าย</label>
              <input type="date"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={value.endDate}
                min={value.date}
                onChange={e => set({ endDate: e.target.value })} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 pl-0.5">
            ถ้าจัด 1 วันให้ใส่วันเริ่มต้นอย่างเดียว · วันสุดท้ายเว้นว่างได้
          </p>
        </div>
      )}

      {/* Preview pill */}
      {preview && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5">
          <CalendarCheck size={12} className="shrink-0" />
          {preview}
        </div>
      )}
    </div>
  )
}

// ─── Build event rows from ScheduleState ──────────────────────────────────────
function buildEventRows(
  schedule: ScheduleState,
  base: { title: string; description: string; location: string; event_type: EventType; created_by: string; project_id: string }
): Array<{ title: string; description: string; location: string; event_type: string; created_by: string; project_id: string; start_time: string; end_time: string }> {
  const { mode, date, endDate, startTime, endTime } = schedule

  const toISO = (d: string, t: string) => new Date(`${d}T${t || '00:00'}`).toISOString()

  if (mode === 'single') {
    return [{
      ...base,
      start_time: toISO(date, startTime),
      end_time:   toISO(date, endTime || startTime || '23:59'),
    }]
  }

  if (mode === 'multi-session') {
    const days = eachDayOfInterval({ start: parseISO(date), end: parseISO(endDate) })
    return days.map(d => {
      const dateStr = format(d, 'yyyy-MM-dd')
      return {
        ...base,
        title: `${base.title}`,
        start_time: toISO(dateStr, startTime),
        end_time:   toISO(dateStr, endTime),
      }
    })
  }

  // allday
  const endD = endDate && endDate >= date ? endDate : date
  return [{
    ...base,
    start_time: toISO(date, '00:00'),
    end_time:   toISO(endD, '23:59'),
  }]
}

// ─── Convert existing event back to ScheduleState (for editing) ───────────────
function eventToSchedule(event: any): ScheduleState {
  const start = parseISO(event.start_time)
  const end   = parseISO(event.end_time)
  const startDate = format(start, 'yyyy-MM-dd')
  const endDate   = format(end, 'yyyy-MM-dd')
  const startTime = format(start, 'HH:mm')
  const endTime   = format(end, 'HH:mm')
  // Detect allday: 00:00 → 23:59
  if (startTime === '00:00' && endTime === '23:59') {
    return { mode: 'allday', date: startDate, endDate: startDate !== endDate ? endDate : '', startTime: '', endTime: '', allDay: true }
  }
  return { mode: 'single', date: startDate, endDate: '', startTime, endTime, allDay: false }
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

  // ── Fetch ──────────────────────────────────────────────────────────────────
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
        .order('start_time', { ascending: true })

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

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAddModal = (type: EventType) => {
    setEditingEvent(null)
    setModalType(type)
    setTitle(''); setDescription(''); setLocation('')
    setSchedule(EMPTY_SCHEDULE)
    setIsModalOpen(true)
  }

  const openEditModal = (event: any) => {
    setEditingEvent(event)
    setModalType(event.event_type === 'main' ? 'main' : 'task')
    setTitle(event.title)
    setDescription(event.description || '')
    setLocation(event.location || '')
    setSchedule(eventToSchedule(event))
    setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setEditingEvent(null) }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedule.date) return alert('กรุณาเลือกวันที่')
    setIsSubmitting(true)
    try {
      const base = {
        title, description, location,
        event_type: modalType,
        created_by: user.id,
        project_id: selectedProject.id,
      }

      if (editingEvent) {
        // Editing: always update the single existing event
        const rows = buildEventRows(schedule, base)
        const { error } = await supabase.from('events').update(rows[0]).eq('id', editingEvent.id)
        if (error) throw error
      } else {
        // New: may insert multiple rows (multi-session)
        const rows = buildEventRows(schedule, base)
        const { error } = await supabase.from('events').insert(rows)
        if (error) throw error
      }

      closeModal()
      fetchProjectEvents(selectedProject.id)
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
      <Sidebar user={user} activePage="projects" onLogout={handleLogout} />
      <MobileNav activePage="projects" />

      <main className="flex-1 overflow-y-auto w-full relative pb-20 md:pb-0">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-10">
          <h1 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
            <FolderKanban className="text-blue-600" size={28} />
            โครงการที่ฉันดูแล
          </h1>
        </header>

        {/* Content */}
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
            <div className="bg-white w-full md:max-w-3xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl" style={{ maxHeight: '92vh' }}>
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

              <div className="flex-1 overflow-y-auto p-5 md:p-7 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                <div className="md:col-span-1">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                    <p className="text-xs font-bold text-gray-500 mb-3 flex justify-center items-center gap-1">
                      <QrCode size={13} /> Line กลุ่มโครงการ
                    </p>
                    <div className="aspect-square bg-white rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden p-2">
                      {selectedProject.line_qr_url
                        ? <img src={selectedProject.line_qr_url} alt="QR" className="w-full h-full object-contain" />
                        : <span className="text-xs text-gray-400">ไม่มี QR Code</span>}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-5">
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
          <div
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '95vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
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

              {/* Type toggle (new only) */}
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

              {/* Scrollable form body */}
              <div className="overflow-y-auto flex-1">
                <form id="event-form" onSubmit={handleSave} className="p-6 space-y-4">
                  {/* Title */}
                  <input type="text" required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={title} onChange={e => setTitle(e.target.value)}
                    placeholder={modalType === 'main' ? 'ชื่อกิจกรรม / วันงาน *' : 'ชื่องาน / สิ่งที่ต้องเตรียม *'}
                  />

                  {/* Schedule picker */}
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">กำหนดการ</p>
                    {editingEvent ? (
                      // Editing: simpler single-mode only
                      <SchedulePicker
                        value={{ ...schedule, mode: 'single' }}
                        onChange={v => setSchedule({ ...v, mode: 'single' })}
                      />
                    ) : (
                      <SchedulePicker value={schedule} onChange={setSchedule} />
                    )}
                  </div>

                  {/* Location */}
                  <input type="text"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="สถานที่"
                  />

                  {/* Description */}
                  <textarea rows={2}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </form>
              </div>

              {/* Submit button pinned at bottom */}
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
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
          <Edit size={13} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
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
  const currentUserManager = managers.find((m: any) => m.student_id === user?.user_metadata?.student_id)
  const sortedManagers = currentUserManager
    ? [currentUserManager, ...managers.filter((m: any) => m.student_id !== user?.user_metadata?.student_id)]
    : managers

  const MAX = 5
  const displayManagers = sortedManagers.slice(0, MAX)
  const remainingCount  = sortedManagers.length - MAX
  const dateSummary     = getProjectDateSummary(events)

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
            {displayManagers.map((mgr: any, idx: number) => (
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

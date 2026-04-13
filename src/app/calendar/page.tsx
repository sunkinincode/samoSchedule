'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToICS } from '@/lib/ics-utils'
import {
  Calendar as CalendarIcon, Download, MapPin, Clock,
  Plus, X, ChevronLeft, ChevronRight, Edit, Trash2,
  List, Grid3X3, Upload, FileText, AlertCircle, CheckCircle2, ListTodo,
  Search, Pin, ExternalLink, Tag,
} from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay,
  parseISO, startOfDay, endOfDay, differenceInDays,
} from 'date-fns'
import { th } from 'date-fns/locale'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import SchedulePicker, {
  ScheduleState, EMPTY_SCHEDULE, buildEventRows, eventToSchedule,
} from '@/components/SchedulePicker'

// ─── Project color palette ────────────────────────────────────────────────────
const PROJECT_COLORS = [
  { light: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
  { light: '#FED7AA', text: '#9A3412', border: '#F97316' },
  { light: '#DCFCE7', text: '#14532D', border: '#22C55E' },
  { light: '#F3E8FF', text: '#6B21A8', border: '#A855F7' },
  { light: '#FFE4E6', text: '#9F1239', border: '#F43F5E' },
  { light: '#CCFBF1', text: '#134E4A', border: '#14B8A6' },
  { light: '#FEF9C3', text: '#713F12', border: '#EAB308' },
  { light: '#E0E7FF', text: '#312E81', border: '#6366F1' },
]
function getProjectColor(projectId?: string | null) {
  if (!projectId) return PROJECT_COLORS[0]
  let hash = 0
  for (let i = 0; i < projectId.length; i++) hash = projectId.charCodeAt(i) + ((hash << 5) - hash)
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

// Task event color (amber-ish, dashed)
const TASK_COLOR = { light: '#FFFBEB', text: '#92400E', border: '#F59E0B' }

// ─── CSV parser ───────────────────────────────────────────────────────────────
// Expected columns: title, start_date, start_time, end_date, end_time, location, description
// Dates: YYYY-MM-DD, Times: HH:MM (optional)
function parseCSV(text: string): { rows: any[]; errors: string[] } {
  const lines  = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { rows: [], errors: ['ไฟล์ว่างหรือไม่มีข้อมูล'] }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const required = ['title', 'start_date']
  const missing  = required.filter(r => !header.includes(r))
  if (missing.length) return { rows: [], errors: [`ไม่พบ column: ${missing.join(', ')}`] }

  const rows: any[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted fields with commas
    const vals: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim())

    const get = (col: string) => (vals[header.indexOf(col)] || '').replace(/^"|"$/g, '').trim()

    const title      = get('title')
    const start_date = get('start_date')
    const start_time = get('start_time')
    const end_date   = get('end_date') || start_date
    const end_time   = get('end_time')
    const location   = get('location')
    const description = get('description')

    if (!title || !start_date) { errors.push(`แถว ${i + 1}: ขาด title หรือ start_date`); continue }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) { errors.push(`แถว ${i + 1}: รูปแบบวันที่ผิด (ต้องเป็น YYYY-MM-DD)`); continue }

    const toISO = (d: string, t: string) => new Date(`${d}T${t || '00:00'}`).toISOString()
    rows.push({
      title, location, description,
      start_time: toISO(start_date, start_time),
      end_time:   toISO(end_date,   end_time || start_time || '23:59'),
    })
  }
  return { rows, errors }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents]         = useState<any[]>([])
  const [taskEvents, setTaskEvents] = useState<any[]>([])  // manager's project tasks
  const [loading, setLoading]       = useState(true)
  const [user, setUser]             = useState<any>(null)
  const [myProjectIds, setMyProjectIds] = useState<string[]>([])

  // Add/edit modal
  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [formTitle, setFormTitle]       = useState('')
  const [formDesc, setFormDesc]         = useState('')
  const [formLoc, setFormLoc]           = useState('')
  const [schedule, setSchedule]         = useState<ScheduleState>(EMPTY_SCHEDULE)

  // CSV modal
  const [isCsvOpen, setIsCsvOpen]       = useState(false)
  const [csvParsed, setCsvParsed]       = useState<any[] | null>(null)
  const [csvErrors, setCsvErrors]       = useState<string[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvFileName, setCsvFileName]   = useState('')
  const csvFileRef = useRef<HTMLInputElement>(null)

  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [currentMonth, setCurrentMonth]   = useState(new Date())
  const [viewMode, setViewMode]           = useState<'month' | 'agenda'>('month')
  const [showTasks, setShowTasks]         = useState(true)  // toggle task visibility
  const [showOverflow, setShowOverflow]   = useState(false)  // mobile overflow menu
  const [searchQ, setSearchQ]             = useState('')
  const [catFilter, setCatFilter]         = useState<string | null>(null)
  const [formCategory, setFormCategory]   = useState('ทั่วไป')
  const [formLinks, setFormLinks]         = useState<{ label: string; url: string }[]>([])
  const [formIsPinned, setFormIsPinned]   = useState(false)

  const isAdmin = user?.user_metadata?.role === 'admin'
  const isPresident = user?.user_metadata?.student_id === '6710210395'
  const canPin = isAdmin || isPresident

  const CATEGORIES = ['ทั่วไป', 'วิชาการ', 'กีฬา', 'บำเพ็ญประโยชน์', 'ศิลปวัฒนธรรม', 'สัมมนา', 'อื่นๆ']

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const loadUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return (window.location.href = '/login')
    setUser(user)
    return user
  }, [])

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, projects(id, name_th), users(department, role)')
      .or('project_id.is.null,event_type.eq.main')
      .order('start_time', { ascending: true })
    if (!error) setEvents(data || [])
  }, [])

  const fetchTaskEvents = useCallback(async (projectIds: string[]) => {
    if (projectIds.length === 0) { setTaskEvents([]); return }
    const { data } = await supabase
      .from('events')
      .select('*, projects(id, name_th)')
      .in('project_id', projectIds)
      .eq('event_type', 'task')
      .order('start_time', { ascending: true })
    setTaskEvents(data || [])
  }, [])

  const fetchMyProjects = useCallback(async (u: any) => {
    const sid = u.user_metadata?.student_id
    if (!sid) return []
    const { data } = await supabase
      .from('projects')
      .select('id')
      .ilike('manager_id', `%${sid}%`)
    const ids = (data || []).map((p: any) => p.id)
    setMyProjectIds(ids)
    return ids
  }, [])

  useEffect(() => {
    ;(async () => {
      const u = await loadUser()
      if (!u) return
      await fetchEvents()
      const ids = await fetchMyProjects(u)
      await fetchTaskEvents(ids)
      setLoading(false)
    })()
  }, [])

  const handleUserUpdated = async () => {
    const u = await loadUser()
    if (u) setUser(u)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // ── Add / Edit modal ───────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditId(null)
    setFormTitle(''); setFormDesc(''); setFormLoc('')
    setFormCategory('ทั่วไป'); setFormLinks([]); setFormIsPinned(false)
    setSchedule(EMPTY_SCHEDULE)
    setIsModalOpen(true)
  }

  const openEditModal = (event: any) => {
    setEditId(event.id)
    setFormTitle(event.title)
    setFormDesc(event.description || '')
    setFormLoc(event.location || '')
    setFormCategory(event.category || 'ทั่วไป')
    setFormLinks(event.links || [])
    setFormIsPinned(event.is_pinned || false)
    setSchedule(eventToSchedule(event))
    setSelectedEvent(null)
    setIsModalOpen(true)
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedule.date) return alert('กรุณาเลือกวันที่')
    setIsSubmitting(true)
    try {
      const base = {
        title: formTitle, description: formDesc, location: formLoc,
        category: formCategory,
        links: formLinks.filter(l => l.url.trim()),
        is_pinned: formIsPinned,
        created_by: user.id,
      }
      if (editId) {
        const rows = buildEventRows(schedule, base)
        const { error } = await supabase.from('events').update(rows[0]).eq('id', editId)
        if (error) throw error
      } else {
        const rows = buildEventRows(schedule, base)
        const { error } = await supabase.from('events').insert(rows)
        if (error) throw error
      }
      setIsModalOpen(false); setEditId(null)
      fetchEvents()
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('ลบกิจกรรมนี้ใช่หรือไม่?')) return
    await supabase.from('events').delete().eq('id', id)
    setSelectedEvent(null)
    fetchEvents()
  }

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { rows, errors } = parseCSV(text)
      setCsvParsed(rows)
      setCsvErrors(errors)
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleCsvImport = async () => {
    if (!csvParsed || csvParsed.length === 0) return
    setCsvImporting(true)
    try {
      const rows = csvParsed.map(r => ({ ...r, created_by: user.id }))
      const { error } = await supabase.from('events').insert(rows)
      if (error) throw error
      setIsCsvOpen(false); setCsvParsed(null); setCsvErrors([])
      fetchEvents()
    } catch (err: any) {
      alert('นำเข้าไม่สำเร็จ: ' + err.message)
    } finally {
      setCsvImporting(false)
    }
  }

  const closeCsvModal = () => {
    setIsCsvOpen(false); setCsvParsed(null); setCsvErrors([]); setCsvFileName('')
    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const monthStart   = startOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end:   endOfWeek(endOfMonth(monthStart)),
  })

  const allDisplayEventsRaw = [
    ...events,
    ...(showTasks ? taskEvents.map(e => ({ ...e, _isTask: true })) : []),
  ]
  const allDisplayEvents = allDisplayEventsRaw
    .filter(e => !catFilter || (e.category || 'ทั่วไป') === catFilter)
    .filter(e => !searchQ || e.title?.toLowerCase().includes(searchQ.toLowerCase()) || e.description?.toLowerCase().includes(searchQ.toLowerCase()))

  const getEventsForDay = (day: Date) =>
    allDisplayEvents.filter(event => {
      const d      = startOfDay(day)
      const evStart = startOfDay(parseISO(event.start_time))
      const evEnd   = endOfDay(parseISO(event.end_time))
      return d >= evStart && d <= evEnd
    })

  const today = startOfDay(new Date())
  const agendaByDate: Record<string, any[]> = {}
  allDisplayEvents
    .filter(e => endOfDay(parseISO(e.end_time)) >= today)
    .slice(0, 60)
    .forEach(event => {
      const key = format(parseISO(event.start_time), 'yyyy-MM-dd')
      if (!agendaByDate[key]) agendaByDate[key] = []
      agendaByDate[key].push(event)
    })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar user={user} activePage="calendar" onLogout={handleLogout} onUserUpdated={handleUserUpdated} />
      <MobileNav activePage="calendar" user={user} onUserUpdated={handleUserUpdated} />

      {/* Close overflow when clicking outside */}
      {showOverflow && (
        <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
      )}

      <main className="flex-1 overflow-y-auto w-full relative pb-20 md:pb-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center gap-2 px-4 md:px-6 py-3">

            {/* Month navigation — left */}
            <div className="flex items-center gap-0.5">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-xl transition">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setCurrentMonth(new Date())}
                className="flex flex-col items-center px-1.5 py-0.5 rounded-xl hover:bg-gray-50 transition">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">
                  {format(currentMonth, 'yyyy')}
                </span>
                <span className="text-base md:text-lg font-black text-gray-900 leading-tight whitespace-nowrap">
                  {format(currentMonth, 'MMMM', { locale: th })}
                </span>
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-xl transition">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ── Mobile: view toggle + overflow ── */}
            <div className="flex md:hidden items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode('month')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                  <Grid3X3 size={15} />
                </button>
                <button onClick={() => setViewMode('agenda')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'agenda' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                  <List size={15} />
                </button>
              </div>

              <div className="relative">
                <button onClick={() => setShowOverflow(!showOverflow)}
                  className={`p-2 rounded-xl border transition ${showOverflow ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600">
                    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                  </svg>
                </button>
                {showOverflow && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 w-52 z-50">
                    <button onClick={() => { setCurrentMonth(new Date()); setShowOverflow(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                      <CalendarIcon size={15} className="text-blue-500" /> วันนี้
                    </button>
                    {myProjectIds.length > 0 && (
                      <button onClick={() => { setShowTasks(!showTasks); setShowOverflow(false) }}
                        className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition text-sm font-medium ${showTasks ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                        <ListTodo size={15} className={showTasks ? 'text-amber-500' : 'text-gray-400'} />
                        {showTasks ? 'ซ่อนงานเตรียม' : 'แสดงงานเตรียม'}
                      </button>
                    )}
                    <div className="h-px bg-gray-100 my-1.5" />
                    <button onClick={() => { exportToICS(events); setShowOverflow(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                      <Download size={15} className="text-gray-400" /> ส่งออก .ics
                    </button>
                    <div className="px-3 py-2">
                      <GoogleCalendarButton compact />
                    </div>
                    {isAdmin && (
                      <>
                        <div className="h-px bg-gray-100 my-1.5" />
                        <button onClick={() => { setIsCsvOpen(true); setShowOverflow(false) }}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                          <Upload size={15} className="text-gray-400" /> นำเข้าจาก CSV
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {isAdmin && (
                <button onClick={openAddModal}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition text-sm font-bold shadow-sm">
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* ── Desktop: full action bar ── */}
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => setCurrentMonth(new Date())}
                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 transition">
                วันนี้
              </button>
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode('month')}
                  className={`p-2 rounded-lg transition ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Grid3X3 size={15} />
                </button>
                <button onClick={() => setViewMode('agenda')}
                  className={`p-2 rounded-lg transition ${viewMode === 'agenda' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <List size={15} />
                </button>
              </div>
              {myProjectIds.length > 0 && (
                <button onClick={() => setShowTasks(!showTasks)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${showTasks ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
                  <ListTodo size={13} /> งานเตรียม
                </button>
              )}
              <button onClick={() => exportToICS(events)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition border border-gray-200">
                <Download size={14} /> ส่งออก
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setIsCsvOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-xs font-bold border border-gray-200">
                    <Upload size={14} /> CSV
                  </button>
                  <button onClick={openAddModal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition text-sm font-bold shadow-sm">
                    <Plus size={16} /> สร้าง
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────────── */}
        {/* ── Search + category filter bar ── */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-2.5 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ค้นหากิจกรรม..."
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCatFilter(null)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${!catFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              ทั้งหมด
            </button>
            {['วิชาการ','กีฬา','บำเพ็ญประโยชน์','ศิลปวัฒนธรรม','สัมมนา'].map(c => (
              <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <section className="p-3 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>

          ) : viewMode === 'agenda' ? (
            /* ══ AGENDA ════════════════════════════════════════════════ */
            <div className="max-w-2xl mx-auto space-y-5">
              {Object.keys(agendaByDate).length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">ไม่มีกิจกรรมที่กำลังจะมาถึง</p>
                </div>
              ) : (
                Object.entries(agendaByDate).map(([dateKey, dayEvents]) => {
                  const date    = parseISO(dateKey)
                  const isToday = isSameDay(date, new Date())
                  return (
                    <div key={dateKey}>
                      <div className={`flex items-center gap-3 mb-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm ${isToday ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                          <span className="text-[9px] font-bold uppercase">{format(date, 'EEE', { locale: th })}</span>
                          <span className="text-lg font-black leading-tight">{format(date, 'd')}</span>
                        </div>
                        <span className="text-xs font-bold">{format(date, 'MMMM yyyy', { locale: th })}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="space-y-2 ml-14">
                        {dayEvents.map(event => {
                          const color = event._isTask ? TASK_COLOR : getProjectColor(event.projects?.id)
                          return (
                            <div key={event.id} onClick={() => setSelectedEvent(event)}
                              style={{ backgroundColor: color.light, borderLeftColor: color.border }}
                              className={`rounded-xl border-l-4 p-3 cursor-pointer hover:brightness-95 transition-all ${event._isTask ? 'border-dashed opacity-80' : ''}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    {event._isTask && <ListTodo size={11} style={{ color: color.text }} />}
                                    <p style={{ color: color.text }} className="font-bold text-sm truncate">{event.title}</p>
                                  </div>
                                  {event.projects?.name_th && (
                                    <span style={{ color: color.text }} className="text-[10px] font-semibold opacity-60 block">{event.projects.name_th}</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-xs text-gray-500 font-medium">
                                    {format(parseISO(event.start_time), 'HH:mm')}
                                  </span>
                                  {(() => {
                                    const days = differenceInDays(startOfDay(parseISO(event.start_time)), startOfDay(new Date()))
                                    if (days === 0) return <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">วันนี้</span>
                                    if (days === 1) return <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">พรุ่งนี้</span>
                                    if (days > 0 && days <= 7) return <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">อีก {days} วัน</span>
                                    return null
                                  })()}
                                </div>
                              </div>
                              {event.location && (
                                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                  <MapPin size={10} /> {event.location}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          ) : (
            /* ══ MONTH VIEW ════════════════════════════════════════════ */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                  <div key={d} className="py-2.5 text-center text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-[72px] md:auto-rows-[120px]">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isToday        = isSameDay(day, new Date())
                  const MAX = 2

                  return (
                    <div key={day.toString()}
                      className={`border-b border-r border-gray-100 overflow-hidden flex flex-col
                        ${!isCurrentMonth ? 'bg-gray-50/60' : 'bg-white'}
                        ${idx % 7 === 6 ? 'border-r-0' : ''}`}>

                      <div className="flex justify-end p-1 md:p-1.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] md:text-xs font-bold rounded-full ${
                          isToday ? 'bg-blue-600 text-white shadow-sm' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                        }`}>{format(day, 'd')}</span>
                      </div>

                      <div className="flex-1 overflow-hidden space-y-px px-px">
                        {dayEvents.slice(0, MAX).map(event => {
                          const evStart  = startOfDay(parseISO(event.start_time))
                          const evEnd    = endOfDay(parseISO(event.end_time))
                          const d        = startOfDay(day)
                          const isStart  = d.getTime() === evStart.getTime()
                          const isEnd    = d.getTime() === evEnd.getTime()
                          const color    = event._isTask ? TASK_COLOR : getProjectColor(event.projects?.id)

                          let rounded = 'rounded-sm'
                          let mx = 'mx-0.5'
                          if (isStart && !isEnd)       { rounded = 'rounded-l-sm rounded-r-none'; mx = 'ml-0.5 mr-0' }
                          else if (!isStart && isEnd)  { rounded = 'rounded-r-sm rounded-l-none'; mx = 'ml-0 mr-0.5' }
                          else if (!isStart && !isEnd) { rounded = 'rounded-none'; mx = 'mx-0' }

                          return (
                            <div key={event.id} onClick={() => setSelectedEvent(event)}
                              style={{ backgroundColor: color.light, borderLeftColor: isStart ? color.border : 'transparent' }}
                              className={`${rounded} ${mx} border-l-[3px] px-1 py-0.5 cursor-pointer hover:brightness-95 transition-all overflow-hidden ${event._isTask ? 'opacity-70' : ''}`}>
                              <span style={{ color: color.text }}
                                className={`font-semibold text-[8px] md:text-[10px] block truncate leading-tight ${!isStart ? 'opacity-0' : ''}`}>
                                {isStart ? event.title : '\u00A0'}
                              </span>
                            </div>
                          )
                        })}
                        {dayEvents.length > MAX && (
                          <p className="text-[8px] md:text-[9px] text-gray-400 font-bold pl-1.5">
                            +{dayEvents.length - MAX} อื่นๆ
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              {allDisplayEvents.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 flex flex-wrap gap-x-4 gap-y-1.5">
                  {Array.from(new Map(
                    allDisplayEvents.filter(e => e.projects).map(e => [e.projects.id, e.projects])
                  ).values()).map((p: any) => {
                    const color = getProjectColor(p.id)
                    return (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <span style={{ backgroundColor: color.border }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                        <span className="text-[10px] text-gray-500 font-medium">{p.name_th}</span>
                      </div>
                    )
                  })}
                  {showTasks && taskEvents.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span style={{ backgroundColor: TASK_COLOR.border }} className="w-2.5 h-2.5 rounded-full shrink-0 opacity-60" />
                      <span className="text-[10px] text-gray-400 font-medium">งานเตรียม (ของฉัน)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Event Detail Modal ───────────────────────────────────────── */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  {selectedEvent.projects?.name_th && (() => {
                    const color = selectedEvent._isTask ? TASK_COLOR : getProjectColor(selectedEvent.projects?.id)
                    return (
                      <span style={{ backgroundColor: color.light, color: color.text }}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-flex items-center gap-1 mb-2">
                        {selectedEvent._isTask && <ListTodo size={10} />}
                        {selectedEvent.projects.name_th}
                        {selectedEvent._isTask && ' · งานเตรียม'}
                      </span>
                    )
                  })()}
                  <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
                </div>
                <button onClick={() => setSelectedEvent(null)}
                  className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-500 transition shrink-0">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {format(parseISO(selectedEvent.start_time), 'd MMM yyyy', { locale: th })}
                      {format(parseISO(selectedEvent.start_time), 'HH:mm') !== '00:00' && ` · ${format(parseISO(selectedEvent.start_time), 'HH:mm')} น.`}
                    </p>
                    {!isSameDay(parseISO(selectedEvent.start_time), parseISO(selectedEvent.end_time)) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ถึง {format(parseISO(selectedEvent.end_time), 'd MMM yyyy', { locale: th })}
                        {format(parseISO(selectedEvent.end_time), 'HH:mm') !== '23:59' && ` · ${format(parseISO(selectedEvent.end_time), 'HH:mm')} น.`}
                      </p>
                    )}
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 self-center">{selectedEvent.location}</p>
                  </div>
                )}
                {selectedEvent.category && selectedEvent.category !== 'ทั่วไป' && (
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-purple-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{selectedEvent.category}</span>
                  </div>
                )}
                {selectedEvent.links && selectedEvent.links.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {selectedEvent.links.map((l: any, i: number) => (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition text-sm font-semibold text-blue-700">
                        <ExternalLink size={14} /> {l.label || l.url}
                      </a>
                    ))}
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</div>
                )}
              </div>

              {(isAdmin || isPresident) && !selectedEvent._isTask && (
                <div className="flex gap-2 border-t border-gray-100 pt-4">
                  {canPin && (
                    <button onClick={async () => {
                      const newVal = !selectedEvent.is_pinned
                      await supabase.from('events').update({ is_pinned: newVal }).eq('id', selectedEvent.id)
                      setSelectedEvent({ ...selectedEvent, is_pinned: newVal })
                      fetchEvents()
                    }}
                      className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl font-bold transition text-sm shrink-0 ${selectedEvent.is_pinned ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      <Pin size={14} /> {selectedEvent.is_pinned ? 'ถอนหมุด' : 'ปักหมุด'}
                    </button>
                  )}
                  <button onClick={() => openEditModal(selectedEvent)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 py-3 rounded-xl font-bold transition text-sm">
                    <Edit size={15} /> แก้ไข
                  </button>
                  <button onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 py-3 rounded-xl font-bold transition text-sm">
                    <Trash2 size={15} /> ลบ
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '95vh' }}
              onClick={e => e.stopPropagation()}>
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-800">{editId ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                <form id="cal-form" onSubmit={handleSaveEvent} className="p-6 space-y-4">
                  <input type="text" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="ชื่อกิจกรรม *" />

                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">กำหนดการ</p>
                    <SchedulePicker value={schedule} onChange={setSchedule} singleModeOnly={!!editId} />
                  </div>

                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={formLoc} onChange={e => setFormLoc(e.target.value)} placeholder="สถานที่" />

                  {/* Category */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">ประเภทกิจกรรม</p>
                    <div className="flex flex-wrap gap-2">
                      {['ทั่วไป', 'วิชาการ', 'กีฬา', 'บำเพ็ญประโยชน์', 'ศิลปวัฒนธรรม', 'สัมมนา', 'อื่นๆ'].map(c => (
                        <button key={c} type="button" onClick={() => setFormCategory(c)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${formCategory === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">ลิงก์แนบ</p>
                      <button type="button"
                        onClick={() => setFormLinks(prev => [...prev, { label: '', url: '' }])}
                        className="text-[10px] font-bold text-blue-600 hover:underline">+ เพิ่มลิงก์</button>
                    </div>
                    {formLinks.map((l, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder="ชื่อลิงก์ เช่น Google Form"
                          value={l.label}
                          onChange={e => setFormLinks(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                          className="w-32 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="url" placeholder="https://..."
                          value={l.url}
                          onChange={e => setFormLinks(prev => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" onClick={() => setFormLinks(prev => prev.filter((_, j) => j !== i))}
                          className="p-2 text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Pin toggle — admin/president only */}
                  {canPin && (
                    <button type="button" onClick={() => setFormIsPinned(!formIsPinned)}
                      className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border transition text-sm font-bold ${formIsPinned ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                      <Pin size={15} /> {formIsPinned ? 'ปักหมุดอยู่ (กดเพื่อถอน)' : 'ปักหมุดกิจกรรมนี้'}
                    </button>
                  )}

                  <textarea rows={2} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="รายละเอียด" />
                </form>
              </div>

              <div className="px-6 pb-6 shrink-0">
                <button form="cal-form" type="submit" disabled={isSubmitting}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60">
                  {isSubmitting ? 'กำลังบันทึก...' : (editId ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรม')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CSV Import Modal ─────────────────────────────────────────── */}
        {isCsvOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeCsvModal}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Upload size={20} className="text-blue-600" /> นำเข้าจาก CSV
                  </h2>
                  <button onClick={closeCsvModal} className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Format guide */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                    <FileText size={13} /> รูปแบบ CSV ที่รองรับ
                  </p>
                  <code className="text-[10px] text-blue-600 leading-relaxed block">
                    title, start_date, start_time, end_date, end_time, location, description
                  </code>
                  <div className="mt-2 text-[10px] text-blue-500 space-y-0.5">
                    <p>• <b>start_date</b> — YYYY-MM-DD เช่น 2026-06-05 (บังคับ)</p>
                    <p>• <b>start_time / end_time</b> — HH:MM เช่น 09:00 (ไม่บังคับ)</p>
                    <p>• <b>end_date</b> — ถ้าว่างจะใช้ start_date</p>
                  </div>
                </div>

                {/* File picker */}
                <div>
                  <input ref={csvFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
                  <button type="button" onClick={() => csvFileRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-sm font-medium text-gray-500 hover:text-blue-600 transition flex items-center justify-center gap-2">
                    <Upload size={16} />
                    {csvFileName ? csvFileName : 'เลือกไฟล์ CSV'}
                  </button>
                </div>

                {/* Errors */}
                {csvErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
                    {csvErrors.map((e, i) => (
                      <p key={i} className="text-[11px] text-red-600 flex items-start gap-1.5">
                        <AlertCircle size={11} className="mt-0.5 shrink-0" /> {e}
                      </p>
                    ))}
                  </div>
                )}

                {/* Preview */}
                {csvParsed && csvParsed.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 mb-2">
                      <CheckCircle2 size={13} /> พบ {csvParsed.length} กิจกรรมที่พร้อมนำเข้า
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {csvParsed.slice(0, 10).map((r, i) => (
                        <p key={i} className="text-[10px] text-emerald-600 truncate">
                          {i + 1}. {r.title} · {format(parseISO(r.start_time), 'd MMM yyyy HH:mm', { locale: th })}
                        </p>
                      ))}
                      {csvParsed.length > 10 && <p className="text-[10px] text-emerald-500">... และอีก {csvParsed.length - 10} รายการ</p>}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={closeCsvModal}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition text-sm">
                    ยกเลิก
                  </button>
                  <button type="button" onClick={handleCsvImport}
                    disabled={!csvParsed || csvParsed.length === 0 || csvImporting}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                    {csvImporting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังนำเข้า...</>
                      : <><Upload size={15} /> นำเข้า {csvParsed?.length || 0} รายการ</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

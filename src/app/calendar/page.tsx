'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToICS } from '@/lib/ics-utils'
import {
  Calendar as CalendarIcon, Download, MapPin, Clock,
  Plus, X, ChevronLeft, ChevronRight, Edit, Trash2,
  List, Grid3X3
} from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay,
  parseISO, startOfDay, endOfDay
} from 'date-fns'
import { th } from 'date-fns/locale'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

// ─── Project color palette ───────────────────────────────────────────────────
const PROJECT_COLORS = [
  { light: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }, // blue
  { light: '#FED7AA', text: '#9A3412', border: '#F97316' }, // orange
  { light: '#DCFCE7', text: '#14532D', border: '#22C55E' }, // green
  { light: '#F3E8FF', text: '#6B21A8', border: '#A855F7' }, // purple
  { light: '#FFE4E6', text: '#9F1239', border: '#F43F5E' }, // rose
  { light: '#CCFBF1', text: '#134E4A', border: '#14B8A6' }, // teal
  { light: '#FEF9C3', text: '#713F12', border: '#EAB308' }, // yellow
  { light: '#E0E7FF', text: '#312E81', border: '#6366F1' }, // indigo
]

function getProjectColor(projectId: string | null | undefined) {
  if (!projectId) return PROJECT_COLORS[0]
  let hash = 0
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '', description: '', startDate: '', startTime: '',
    endDate: '', endTime: '', location: ''
  })

  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month')

  const isAdmin = user?.user_metadata?.role === 'admin'

  useEffect(() => {
    fetchUserData()
    fetchEvents()
  }, [])

  const fetchUserData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return (window.location.href = '/login')
    setUser(user)
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, projects(id, name_th), users(department, role)')
      .or('project_id.is.null,event_type.eq.main')
      .order('start_time', { ascending: true })
    if (!error) setEvents(data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const openAddModal = () => {
    setEditId(null)
    setFormData({ title: '', description: '', startDate: '', startTime: '', endDate: '', endTime: '', location: '' })
    setIsModalOpen(true)
  }

  const handleAddOrEditEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const start_time = new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
      const end_time = new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
      const payload = {
        title: formData.title, description: formData.description,
        start_time, end_time, location: formData.location, created_by: user.id
      }
      if (editId) await supabase.from('events').update(payload).eq('id', editId)
      else await supabase.from('events').insert(payload)

      setIsModalOpen(false)
      setEditId(null)
      setFormData({ title: '', description: '', startDate: '', startTime: '', endDate: '', endTime: '', location: '' })
      fetchEvents()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (event: any) => {
    setEditId(event.id)
    setFormData({
      title: event.title,
      description: event.description || '',
      startDate: format(parseISO(event.start_time), 'yyyy-MM-dd'),
      startTime: format(parseISO(event.start_time), 'HH:mm'),
      endDate: format(parseISO(event.end_time), 'yyyy-MM-dd'),
      endTime: format(parseISO(event.end_time), 'HH:mm'),
      location: event.location || ''
    })
    setSelectedEvent(null)
    setIsModalOpen(true)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) return
    await supabase.from('events').delete().eq('id', id)
    setSelectedEvent(null)
    fetchEvents()
  }

  // ─── Calendar grid data ───────────────────────────────────────────────────
  const monthStart = startOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart))
  })

  // ─── Agenda view data ─────────────────────────────────────────────────────
  const today = startOfDay(new Date())
  const upcomingEvents = events
    .filter(e => endOfDay(parseISO(e.end_time)) >= today)
    .slice(0, 40)

  const agendaByDate: Record<string, any[]> = {}
  upcomingEvents.forEach(event => {
    const key = format(parseISO(event.start_time), 'yyyy-MM-dd')
    if (!agendaByDate[key]) agendaByDate[key] = []
    agendaByDate[key].push(event)
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getEventsForDay = (day: Date) =>
    events.filter(event => {
      const evStart = startOfDay(parseISO(event.start_time))
      const evEnd = endOfDay(parseISO(event.end_time))
      const d = startOfDay(day)
      return d >= evStart && d <= evEnd
    })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar user={user} activePage="calendar" onLogout={handleLogout} />
      <MobileNav activePage="calendar" />

      <main className="flex-1 overflow-y-auto w-full relative pb-20 md:pb-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="text-base md:text-lg font-black text-gray-800 w-36 md:w-44 text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </h1>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="hidden sm:inline-flex text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition ml-1"
              >
                วันนี้
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => setViewMode('month')}
                  title="มุมมองเดือน"
                  className={`p-2 rounded-lg transition ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  title="มุมมองรายการ"
                  className={`p-2 rounded-lg transition ${viewMode === 'agenda' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List size={16} />
                </button>
              </div>

              <button
                onClick={() => exportToICS(events)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition border border-gray-200"
              >
                <Download size={15} /> ส่งออก
              </button>

              {isAdmin && (
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-bold shadow-sm"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">สร้างกิจกรรม</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <section className="p-3 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>

          ) : viewMode === 'agenda' ? (
            /* ══ AGENDA VIEW ═══════════════════════════════════════════════ */
            <div className="max-w-2xl mx-auto space-y-5">
              {Object.keys(agendaByDate).length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">ไม่มีกิจกรรมที่กำลังจะมาถึง</p>
                </div>
              ) : (
                Object.entries(agendaByDate).map(([dateKey, dayEvents]) => {
                  const date = parseISO(dateKey)
                  const isToday = isSameDay(date, new Date())
                  return (
                    <div key={dateKey}>
                      {/* Date header */}
                      <div className={`flex items-center gap-3 mb-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm ${isToday ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                          <span className="text-[9px] font-bold uppercase leading-none">{format(date, 'EEE', { locale: th })}</span>
                          <span className="text-lg font-black leading-tight">{format(date, 'd')}</span>
                        </div>
                        <span className="text-xs font-bold tracking-wide">{format(date, 'MMMM yyyy', { locale: th })}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      {/* Event cards */}
                      <div className="space-y-2 ml-14">
                        {dayEvents.map(event => {
                          const color = getProjectColor(event.projects?.id)
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              style={{ backgroundColor: color.light, borderLeftColor: color.border }}
                              className="rounded-xl border-l-4 p-3 cursor-pointer hover:brightness-95 active:scale-[0.99] transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p style={{ color: color.text }} className="font-bold text-sm truncate">{event.title}</p>
                                  {event.projects?.name_th && (
                                    <span style={{ color: color.text }} className="text-[10px] font-semibold opacity-60 truncate block">
                                      {event.projects.name_th}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 font-medium shrink-0 mt-0.5">
                                  {format(parseISO(event.start_time), 'HH:mm')}
                                </span>
                              </div>
                              {event.location && (
                                <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
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
            /* ══ MONTH VIEW ════════════════════════════════════════════════ */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                  <div key={day} className="py-2.5 text-center text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 auto-rows-[72px] md:auto-rows-[120px]">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isToday = isSameDay(day, new Date())
                  const MAX_VISIBLE = 2

                  return (
                    <div
                      key={day.toString()}
                      className={`border-b border-r border-gray-100 overflow-hidden flex flex-col
                        ${!isCurrentMonth ? 'bg-gray-50/60' : 'bg-white'}
                        ${idx % 7 === 6 ? 'border-r-0' : ''}
                      `}
                    >
                      {/* Date number */}
                      <div className="flex justify-end p-1 md:p-1.5">
                        <span className={`
                          inline-flex items-center justify-center w-6 h-6 text-[10px] md:text-xs font-bold rounded-full
                          ${isToday
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                          }
                        `}>
                          {format(day, 'd')}
                        </span>
                      </div>

                      {/* Event pills */}
                      <div className="flex-1 overflow-hidden space-y-px px-px">
                        {dayEvents.slice(0, MAX_VISIBLE).map(event => {
                          const evStart = startOfDay(parseISO(event.start_time))
                          const evEnd = endOfDay(parseISO(event.end_time))
                          const d = startOfDay(day)
                          const isStart = d.getTime() === evStart.getTime()
                          const isEnd = d.getTime() === evEnd.getTime()
                          const color = getProjectColor(event.projects?.id)

                          // Rounded corners for multi-day spans
                          let rounded = 'rounded-sm'
                          let mx = 'mx-0.5'
                          if (isStart && !isEnd)       { rounded = 'rounded-l-sm rounded-r-none'; mx = 'ml-0.5 mr-0' }
                          else if (!isStart && isEnd)  { rounded = 'rounded-r-sm rounded-l-none'; mx = 'ml-0 mr-0.5' }
                          else if (!isStart && !isEnd) { rounded = 'rounded-none'; mx = 'mx-0' }

                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              style={{
                                backgroundColor: color.light,
                                borderLeftColor: isStart ? color.border : 'transparent',
                              }}
                              className={`${rounded} ${mx} border-l-[3px] px-1 py-0.5 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all overflow-hidden`}
                            >
                              <span
                                style={{ color: color.text }}
                                className={`font-semibold text-[8px] md:text-[10px] block truncate leading-tight ${!isStart ? 'opacity-0' : ''}`}
                              >
                                {isStart ? event.title : '\u00A0'}
                              </span>
                            </div>
                          )
                        })}

                        {/* Overflow count */}
                        {dayEvents.length > MAX_VISIBLE && (
                          <p className="text-[8px] md:text-[9px] text-gray-400 font-bold pl-1.5 leading-tight">
                            +{dayEvents.length - MAX_VISIBLE} อื่นๆ
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Color legend */}
              {events.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 flex flex-wrap gap-x-4 gap-y-1.5">
                  {Array.from(
                    new Map(events.filter(e => e.projects).map(e => [e.projects.id, e.projects])).values()
                  ).map((project: any) => {
                    const color = getProjectColor(project.id)
                    return (
                      <div key={project.id} className="flex items-center gap-1.5">
                        <span style={{ backgroundColor: color.border }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                        <span className="text-[10px] text-gray-500 font-medium">{project.name_th}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Event Detail Modal ─────────────────────────────────────────── */}
        {selectedEvent && (
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle (mobile) */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

              {/* Project badge + title */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  {selectedEvent.projects?.name_th && (() => {
                    const color = getProjectColor(selectedEvent.projects?.id)
                    return (
                      <span
                        style={{ backgroundColor: color.light, color: color.text }}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block mb-2"
                      >
                        {selectedEvent.projects.name_th}
                      </span>
                    )
                  })()}
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedEvent.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-500 transition shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {format(parseISO(selectedEvent.start_time), 'd MMM yyyy', { locale: th })} &nbsp;
                      {format(parseISO(selectedEvent.start_time), 'HH:mm')} น.
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ถึง {format(parseISO(selectedEvent.end_time), 'd MMM yyyy', { locale: th })} &nbsp;
                      {format(parseISO(selectedEvent.end_time), 'HH:mm')} น.
                    </p>
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

                {selectedEvent.description && (
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {selectedEvent.description}
                  </div>
                )}
              </div>

              {/* Admin actions */}
              {isAdmin && (
                <div className="flex gap-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => openEditModal(selectedEvent)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 py-3 rounded-xl font-bold transition text-sm"
                  >
                    <Edit size={15} /> แก้ไข
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 py-3 rounded-xl font-bold transition text-sm"
                  >
                    <Trash2 size={15} /> ลบกิจกรรม
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => { setIsModalOpen(false); setEditId(null) }}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-gray-800">
                  {editId ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}
                </h2>
                <button
                  onClick={() => { setIsModalOpen(false); setEditId(null) }}
                  className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddOrEditEvent} className="space-y-3">
                <input
                  type="text" required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ชื่อกิจกรรม *"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase pl-1 tracking-wide">วันเริ่มต้น</label>
                    <input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase pl-1 tracking-wide">เวลาเริ่ม</label>
                    <input type="time" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase pl-1 tracking-wide">วันสิ้นสุด</label>
                    <input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase pl-1 tracking-wide">เวลาสิ้นสุด</label>
                    <input type="time" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                  </div>
                </div>

                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="สถานที่"
                />
                <textarea
                  rows={3}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                />

                <button
                  type="submit" disabled={isSubmitting}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-60"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

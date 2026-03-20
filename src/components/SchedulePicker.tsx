'use client'
import { useMemo } from 'react'
import { CalendarDays, CalendarClock, CalendarRange, Sun, Clock } from 'lucide-react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { th } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ScheduleMode = 'single' | 'timespan' | 'multi-session' | 'allday'

export interface ScheduleState {
  mode:       ScheduleMode
  // start
  date:       string   // start date (all modes)
  startTime:  string   // start time (single, timespan, multi-session)
  // end
  endDate:    string   // end date (timespan, multi-session, allday)
  endTime:    string   // end time (single, timespan, multi-session)
}

export const EMPTY_SCHEDULE: ScheduleState = {
  mode: 'single', date: '', startTime: '', endDate: '', endTime: '',
}

// ─── Convert existing DB event → ScheduleState ────────────────────────────────
export function eventToSchedule(event: any): ScheduleState {
  const start     = parseISO(event.start_time)
  const end       = parseISO(event.end_time)
  const date      = format(start, 'yyyy-MM-dd')
  const endDate   = format(end,   'yyyy-MM-dd')
  const startTime = format(start, 'HH:mm')
  const endTime   = format(end,   'HH:mm')

  const isAlldayStyle = startTime === '00:00' && endTime === '23:59'
  const sameDay       = date === endDate

  if (isAlldayStyle) {
    return { mode: 'allday', date, endDate: sameDay ? '' : endDate, startTime: '', endTime: '' }
  }
  if (!sameDay) {
    return { mode: 'timespan', date, endDate, startTime, endTime }
  }
  return { mode: 'single', date, startTime, endDate: '', endTime }
}

// ─── Build DB rows from ScheduleState ─────────────────────────────────────────
export function buildEventRows(
  schedule: ScheduleState,
  base: Record<string, any>
): Array<Record<string, any>> {
  const { mode, date, endDate, startTime, endTime } = schedule

  const toISO = (d: string, t: string) =>
    new Date(`${d}T${t || '00:00'}`).toISOString()

  if (mode === 'single') {
    return [{
      ...base,
      start_time: toISO(date, startTime),
      end_time:   toISO(date, endTime || startTime || '23:59'),
    }]
  }

  if (mode === 'timespan') {
    return [{
      ...base,
      start_time: toISO(date,    startTime || '00:00'),
      end_time:   toISO(endDate || date, endTime || '23:59'),
    }]
  }

  if (mode === 'multi-session') {
    const realEndDate = endDate && endDate >= date ? endDate : date
    const days = eachDayOfInterval({ start: parseISO(date), end: parseISO(realEndDate) })
    return days.map(d => {
      const ds = format(d, 'yyyy-MM-dd')
      return {
        ...base,
        start_time: toISO(ds, startTime),
        end_time:   toISO(ds, endTime),
      }
    })
  }

  // allday
  const realEnd = endDate && endDate >= date ? endDate : date
  return [{
    ...base,
    start_time: toISO(date,    '00:00'),
    end_time:   toISO(realEnd, '23:59'),
  }]
}

// ─── SchedulePicker UI ────────────────────────────────────────────────────────
interface SchedulePickerProps {
  value:         ScheduleState
  onChange:      (v: ScheduleState) => void
  singleModeOnly?: boolean   // for edit: lock to single mode
}

export default function SchedulePicker({ value, onChange, singleModeOnly = false }: SchedulePickerProps) {
  const set = (patch: Partial<ScheduleState>) => onChange({ ...value, ...patch })

  // ── Preview text ────────────────────────────────────────────────────────────
  const preview = useMemo(() => {
    const fmtDate = (d: string) => d ? format(parseISO(d), 'd MMM yyyy', { locale: th }) : ''
    const { mode, date, endDate, startTime, endTime } = value

    if (!date) return null

    if (mode === 'single') {
      if (startTime && endTime) return `${fmtDate(date)} · ${startTime}–${endTime} น.`
      if (startTime)            return `${fmtDate(date)} · เริ่ม ${startTime} น.`
      return fmtDate(date)
    }

    if (mode === 'timespan') {
      if (!endDate) return null
      const sameDay = date === endDate
      if (sameDay) return `${fmtDate(date)} · ${startTime || '00:00'}–${endTime || '23:59'} น.`
      return `${fmtDate(date)} ${startTime || '00:00'} น. — ${fmtDate(endDate)} ${endTime || '23:59'} น.`
    }

    if (mode === 'multi-session') {
      if (!endDate || endDate < date) return null
      const days = eachDayOfInterval({ start: parseISO(date), end: parseISO(endDate) })
      const time = (startTime && endTime) ? ` · ${startTime}–${endTime} น.` : ''
      return `${days.length} วัน${time} → สร้าง ${days.length} กิจกรรม`
    }

    if (mode === 'allday') {
      if (!endDate || endDate <= date) return `${fmtDate(date)} ทั้งวัน`
      const days = eachDayOfInterval({ start: parseISO(date), end: parseISO(endDate) })
      return `${fmtDate(date)} – ${fmtDate(endDate)} · ${days.length} วัน ทั้งวัน`
    }
    return null
  }, [value])

  // ── Mode button ─────────────────────────────────────────────────────────────
  const modeBtn = (
    mode: ScheduleMode,
    icon: React.ReactNode,
    label: string,
    sub: string
  ) => (
    <button
      type="button"
      onClick={() => set({ mode })}
      disabled={singleModeOnly}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-center transition ${
        value.mode === mode
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : singleModeOnly
            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      <span>{icon}</span>
      <span className="text-[10px] font-bold leading-tight">{label}</span>
      <span className={`text-[8px] leading-tight ${value.mode === mode ? 'text-blue-100' : 'text-gray-400'}`}>{sub}</span>
    </button>
  )

  const inputCls = 'w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-[9px] font-bold text-gray-400 uppercase pl-0.5 block mb-1'

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      {!singleModeOnly && (
        <div className="flex gap-1.5">
          {modeBtn('single',        <CalendarDays size={14} />,  'วันเดียว',    'มีเวลาหรือไม่ก็ได้')}
          {modeBtn('timespan',      <Clock size={14} />,         'ช่วงเวลา',    'ต่างวัน ต่างเวลา')}
          {modeBtn('multi-session', <CalendarClock size={14} />, 'หลายวัน',     'เวลาเดิมทุกวัน')}
          {modeBtn('allday',        <Sun size={14} />,           'ทั้งวัน',     'ไม่ระบุเวลา')}
        </div>
      )}

      {/* ── single ────────────────────────────────────────────────────── */}
      {value.mode === 'single' && (
        <div className="space-y-2">
          <div>
            <label className={labelCls}>วันที่จัด</label>
            <input type="date" className={inputCls} required
              value={value.date} onChange={e => set({ date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>เวลาเริ่ม (ไม่บังคับ)</label>
              <input type="time" className={inputCls}
                value={value.startTime} onChange={e => set({ startTime: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>เวลาสิ้นสุด (ไม่บังคับ)</label>
              <input type="time" className={inputCls}
                value={value.endTime} onChange={e => set({ endTime: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* ── timespan ──────────────────────────────────────────────────── */}
      {value.mode === 'timespan' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>วันเริ่ม</label>
              <input type="date" className={inputCls} required
                value={value.date} onChange={e => set({ date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>เวลาเริ่ม</label>
              <input type="time" className={inputCls} required
                value={value.startTime} onChange={e => set({ startTime: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>วันสิ้นสุด</label>
              <input type="date" className={inputCls} required min={value.date}
                value={value.endDate} onChange={e => set({ endDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>เวลาสิ้นสุด</label>
              <input type="time" className={inputCls} required
                value={value.endTime} onChange={e => set({ endTime: e.target.value })} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            เช่น 9 มิ.ย. 06:00 ถึง 11 มิ.ย. 22:00 น. — สร้าง 1 กิจกรรมที่ต่อเนื่องข้ามวัน
          </p>
        </div>
      )}

      {/* ── multi-session ─────────────────────────────────────────────── */}
      {value.mode === 'multi-session' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>วันเริ่มต้น</label>
              <input type="date" className={inputCls} required
                value={value.date} onChange={e => set({ date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>วันสุดท้าย</label>
              <input type="date" className={inputCls} required min={value.date}
                value={value.endDate} onChange={e => set({ endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>เวลาเริ่ม (เหมือนกันทุกวัน)</label>
              <input type="time" className={inputCls} required
                value={value.startTime} onChange={e => set({ startTime: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>เวลาสิ้นสุด</label>
              <input type="time" className={inputCls} required
                value={value.endTime} onChange={e => set({ endTime: e.target.value })} />
            </div>
          </div>
          {/* Day chips */}
          {value.date && value.endDate && value.endDate >= value.date && (() => {
            const days = eachDayOfInterval({ start: parseISO(value.date), end: parseISO(value.endDate) })
            return (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {days.map(d => (
                  <span key={d.toISOString()} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded-full">
                    {format(d, 'EEEEEE d MMM', { locale: th })}
                  </span>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── allday ────────────────────────────────────────────────────── */}
      {value.mode === 'allday' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>วันเริ่มต้น</label>
              <input type="date" className={inputCls} required
                value={value.date} onChange={e => set({ date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>วันสุดท้าย (ไม่บังคับ)</label>
              <input type="date" className={inputCls} min={value.date}
                value={value.endDate} onChange={e => set({ endDate: e.target.value })} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">เว้นว่างวันสุดท้ายถ้าจัดวันเดียว</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5">
          <CalendarRange size={12} className="shrink-0 text-blue-400" />
          {preview}
        </div>
      )}
    </div>
  )
}

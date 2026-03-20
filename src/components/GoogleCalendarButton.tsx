'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Link2, Link2Off, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

// Google Calendar icon (SVG)
function GoogleCalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="white" stroke="#DADCE0" strokeWidth="1.5" />
      <rect x="3" y="8" width="18" height="2" fill="#1A73E8" />
      <rect x="3" y="8" width="2" height="13" fill="#1A73E8" />
      <rect x="19" y="8" width="2" height="13" fill="#1A73E8" />
      <text x="12" y="20" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1A73E8">CAL</text>
    </svg>
  )
}

interface Props {
  compact?: boolean   // compact mode for sidebar
}

export default function GoogleCalendarButton({ compact = false }: Props) {
  const [connected, setConnected]   = useState<boolean | null>(null)  // null = loading
  const [syncing, setSyncing]       = useState(false)
  const [disconnecting, setDisconn] = useState(false)
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // ── Check connection status ────────────────────────────────────────────────
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('google_calendar_connected')
      .eq('id', user.id)
      .single()
    setConnected(data?.google_calendar_connected ?? false)
  }

  // ── Check URL params for callback result ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const gcal = params.get('gcal')
    if (gcal === 'connected') {
      setConnected(true)
      setLastResult({ ok: true, msg: 'เชื่อมต่อ Google Calendar สำเร็จ! ✓' })
      // ลบ query param ออกจาก URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (gcal === 'error') {
      setLastResult({ ok: false, msg: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (gcal === 'cancelled') {
      setLastResult({ ok: false, msg: 'ยกเลิกการเชื่อมต่อ' })
      window.history.replaceState({}, '', window.location.pathname)
    }
    // Auto-clear message after 5s
    if (gcal) setTimeout(() => setLastResult(null), 5000)
  }, [])

  // ── Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    setLastResult(null)
    try {
      const res  = await fetch('/api/google-calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setLastResult({
          ok:  true,
          msg: `Sync สำเร็จ ${data.synced} กิจกรรม (สร้าง ${data.created}, อัปเดต ${data.updated})`,
        })
      } else {
        setLastResult({ ok: false, msg: data.error || 'Sync ไม่สำเร็จ' })
      }
    } catch {
      setLastResult({ ok: false, msg: 'เกิดข้อผิดพลาด' })
    } finally {
      setSyncing(false)
      setTimeout(() => setLastResult(null), 6000)
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm('ยืนยันการยกเลิกเชื่อมต่อ Google Calendar?')) return
    setDisconn(true)
    try {
      await fetch('/api/google-calendar/disconnect', { method: 'POST' })
      setConnected(false)
      setLastResult({ ok: true, msg: 'ยกเลิกการเชื่อมต่อแล้ว' })
    } catch {
      setLastResult({ ok: false, msg: 'เกิดข้อผิดพลาด' })
    } finally {
      setDisconn(false)
      setTimeout(() => setLastResult(null), 4000)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (connected === null) return null

  // ── Compact mode (for sidebar) ────────────────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-1.5">
        {/* Status + main action */}
        {connected ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold transition border border-blue-200 disabled:opacity-60"
            >
              {syncing
                ? <Loader2 size={12} className="animate-spin" />
                : <RefreshCw size={12} />
              }
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              title="ยกเลิกเชื่อมต่อ"
              className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-xl transition border border-gray-200 disabled:opacity-60"
            >
              <Link2Off size={13} />
            </button>
          </div>
        ) : (
          <a
            href="/api/google-calendar/auth"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-[11px] font-bold transition border border-gray-200"
          >
            <GoogleCalIcon size={14} />
            เชื่อมต่อ Google Calendar
          </a>
        )}

        {/* Result message */}
        {lastResult && (
          <p className={`text-[10px] font-medium flex items-center gap-1 px-1 ${lastResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
            {lastResult.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {lastResult.msg}
          </p>
        )}
      </div>
    )
  }

  // ── Full mode (for calendar page header) ──────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            {/* Connected status */}
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 size={10} /> เชื่อมต่อแล้ว
            </span>

            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-xl text-sm font-bold transition border border-blue-200 shadow-sm disabled:opacity-60"
            >
              {syncing
                ? <Loader2 size={15} className="animate-spin" />
                : <RefreshCw size={15} />
              }
              <span className="hidden sm:inline">{syncing ? 'กำลัง Sync...' : 'Sync ไปยัง Google'}</span>
            </button>

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              title="ยกเลิกเชื่อมต่อ Google Calendar"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition border border-gray-200 disabled:opacity-60"
            >
              <Link2Off size={15} />
            </button>
          </>
        ) : (
          <a
            href="/api/google-calendar/auth"
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold transition border border-gray-200 shadow-sm"
          >
            <GoogleCalIcon size={16} />
            <span className="hidden sm:inline">เชื่อมต่อ Google Calendar</span>
          </a>
        )}
      </div>

      {/* Inline result message */}
      {lastResult && (
        <p className={`text-xs font-medium flex items-center gap-1 ${lastResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
          {lastResult.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {lastResult.msg}
        </p>
      )}
    </div>
  )
}

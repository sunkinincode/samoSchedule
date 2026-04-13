'use client'
import { useState } from 'react'
import { Calendar as CalendarIcon, FolderKanban, TrendingUp, User as UserIcon, LogOut, Pencil, X, Camera, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface MobileNavProps {
  activePage: 'calendar' | 'projects' | 'dashboard' | 'proposal'
  user?: any
  onUserUpdated?: () => void
}

export default function MobileNav({ activePage, user, onUserUpdated }: MobileNavProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isEditPhoto, setIsEditPhoto]     = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)

  const avatarUrl = user?.user_metadata?.avatar_url
  const fullName  = user?.user_metadata?.full_name || user?.user_metadata?.student_id || 'ผู้ใช้งาน'
  const dept      = user?.user_metadata?.department || 'สมาชิก'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSavePhoto = async () => {
    if (!selectedFile || !user) return
    setUploading(true)
    try {
      const ext      = selectedFile.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true, contentType: selectedFile.type })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      await supabase.auth.updateUser({ data: { ...user.user_metadata, avatar_url: publicUrl } })
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)

      setIsEditPhoto(false)
      setPreviewUrl(null)
      setSelectedFile(null)
      onUserUpdated?.()
    } catch (err: any) {
      alert('อัปโหลดไม่สำเร็จ: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* ── Bottom Tab Bar ──────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30">
        <div className="flex items-stretch">

          {/* Dashboard tab */}
          <Link href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              activePage === 'dashboard' ? 'text-blue-600' : 'text-gray-400'
            }`}>
            <TrendingUp size={22} strokeWidth={activePage === 'dashboard' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">หน้าหลัก</span>
          </Link>

          {/* Calendar tab */}
          <Link href="/calendar"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              activePage === 'calendar' ? 'text-blue-600' : 'text-gray-400'
            }`}>
            <CalendarIcon size={22} strokeWidth={activePage === 'calendar' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">ปฏิทิน</span>
          </Link>

          {/* Projects tab */}
          <Link href="/projects"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              activePage === 'projects' ? 'text-blue-600' : 'text-gray-400'
            }`}>
            <FolderKanban size={22} strokeWidth={activePage === 'projects' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">โครงการ</span>
          </Link>

          {/* Profile tab */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors text-gray-400 active:text-blue-600"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 border border-gray-300">
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                : <UserIcon size={14} className="text-gray-400 m-auto mt-0.5" />
              }
            </div>
            <span className="text-[10px] font-semibold">โปรไฟล์</span>
          </button>
        </div>

        {/* Home indicator spacing for iPhone */}
        <div className="h-safe-bottom" />
      </nav>

      {/* ── Profile Bottom Sheet ─────────────────────────────────────────── */}
      {isProfileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setIsProfileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative bg-white rounded-t-3xl shadow-2xl pb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />

            {/* Close */}
            <button
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-3 right-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {/* Profile info */}
            <div className="flex items-center gap-4 px-6 pb-4 border-b border-gray-100">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-blue-100 border-2 border-white shadow-md">
                  {avatarUrl
                    ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <UserIcon size={30} className="text-blue-300 m-auto mt-3" />
                  }
                </div>
                <button
                  onClick={() => { setIsEditPhoto(true); setIsProfileOpen(false) }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow border-2 border-white"
                >
                  <Pencil size={10} />
                </button>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.user_metadata?.student_id}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {dept}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pt-3 space-y-1">
              <button
                onClick={() => { setIsEditPhoto(true); setIsProfileOpen(false) }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Camera size={17} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">เปลี่ยนรูปโปรไฟล์</p>
                  <p className="text-xs text-gray-400">อัปโหลดรูปใหม่จากเครื่อง</p>
                </div>
              </button>

              <div className="h-px bg-gray-100 mx-4" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl hover:bg-red-50 transition text-left"
              >
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <LogOut size={17} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">ออกจากระบบ</p>
                  <p className="text-xs text-gray-400">{user?.user_metadata?.student_id}@psu.ac.th</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Photo Sheet ─────────────────────────────────────────────── */}
      {isEditPhoto && (
        <div
          className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end"
          onClick={() => setIsEditPhoto(false)}
        >
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl shadow-2xl pb-8 px-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-5" />
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-800">เปลี่ยนรูปโปรไฟล์</h2>
              <button onClick={() => setIsEditPhoto(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                <X size={16} />
              </button>
            </div>

            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-blue-100 border-2 border-white shadow-lg">
                  {previewUrl
                    ? <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                    : avatarUrl
                      ? <img src={avatarUrl} className="w-full h-full object-cover" alt="current" />
                      : <UserIcon size={44} className="text-blue-300 m-auto mt-5" />
                  }
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow border-2 border-white cursor-pointer">
                  <Camera size={14} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              {previewUrl && <p className="text-xs text-gray-400">รูปจะถูกอัปโหลดเมื่อกด "บันทึก"</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsEditPhoto(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm">
                ยกเลิก
              </button>
              <button onClick={handleSavePhoto}
                disabled={!selectedFile || uploading}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? <><Loader2 size={15} className="animate-spin" /> กำลังอัปโหลด...</> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

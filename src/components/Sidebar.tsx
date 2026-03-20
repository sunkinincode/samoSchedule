'use client'
import { useState, useRef } from 'react'
import { Calendar as CalendarIcon, FolderKanban, LayoutDashboard, LogOut, User as UserIcon, Pencil, X, Camera, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import GoogleCalendarButton from '@/components/GoogleCalendarButton'

interface SidebarProps {
  user: any
  activePage: 'calendar' | 'projects'
  onLogout: () => void
  onUserUpdated?: () => void   // callback to refresh user state in parent
}

export default function Sidebar({ user, activePage, onLogout, onUserUpdated }: SidebarProps) {
  const [isEditOpen, setIsEditOpen]   = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarUrl = user?.user_metadata?.avatar_url
  const fullName  = user?.user_metadata?.full_name || user?.user_metadata?.student_id || 'ผู้ใช้งาน'
  const dept      = user?.user_metadata?.department || 'สมาชิก'

  // ── File pick ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // ── Upload & save ────────────────────────────────────────────────────────
  const handleSavePhoto = async () => {
    if (!selectedFile || !user) return
    setUploading(true)
    try {
      // 1. Upload to Supabase Storage bucket "avatars"
      const ext      = selectedFile.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true, contentType: selectedFile.type })

      if (uploadErr) throw uploadErr

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      // 3. Update Supabase Auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: publicUrl },
      })
      if (authErr) throw authErr

      // 4. Update public.users table
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)

      setIsEditOpen(false)
      setPreviewUrl(null)
      setSelectedFile(null)
      onUserUpdated?.()
    } catch (err: any) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + (err.message || 'กรุณาตรวจสอบ bucket "avatars" ใน Supabase Storage'))
    } finally {
      setUploading(false)
    }
  }

  const closeEdit = () => {
    setIsEditOpen(false)
    setPreviewUrl(null)
    setSelectedFile(null)
  }

  return (
    <>
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
          {/* Avatar with pencil button */}
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                : <UserIcon size={40} className="text-blue-400" />
              }
            </div>
            <button
              onClick={() => setIsEditOpen(true)}
              title="เปลี่ยนรูปโปรไฟล์"
              className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition border-2 border-white"
            >
              <Pencil size={12} />
            </button>
          </div>

          <p className="font-bold text-gray-800 text-center truncate w-full px-2">{fullName}</p>
          <p className="text-[10px] font-medium text-blue-500 mt-1 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full text-center">
            {dept}
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

      {/* ── Profile Edit Modal ─────────────────────────────────────────────── */}
      {isEditOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-800">เปลี่ยนรูปโปรไฟล์</h2>
              <button onClick={closeEdit} className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition">
                <X size={16} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-28 h-28 bg-blue-100 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {previewUrl
                    ? <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                    : avatarUrl
                      ? <img src={avatarUrl} className="w-full h-full object-cover" alt="current" />
                      : <UserIcon size={52} className="text-blue-300 m-auto mt-7" />
                  }
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition border-2 border-white"
                >
                  <Camera size={15} />
                </button>
              </div>

              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={handleFileChange}
              />

              {!previewUrl && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
                >
                  <Camera size={16} /> เลือกรูปจากเครื่อง
                </button>
              )}

              {previewUrl && (
                <p className="text-xs text-gray-500 text-center">
                  รูปจะถูกอัปโหลดเมื่อกด "บันทึก"
                </p>
              )}
            </div>

            {/* Info */}
            <p className="text-[11px] text-gray-400 text-center mb-4">
              รองรับ JPG, PNG, WEBP · ขนาดไม่เกิน 5MB<br />
              รูปจาก LMS จะยังคงอยู่จนกว่าจะเปลี่ยน
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!selectedFile || uploading}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {uploading ? <><Loader2 size={15} className="animate-spin" /> กำลังอัปโหลด...</> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

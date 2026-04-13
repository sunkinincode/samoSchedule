'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ChevronDown, Sparkles, Download, Loader2, CheckCircle2, RotateCcw
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

// ─── SDG Data ────────────────────────────────────────────────────────────────
const SDGS = [
  { id: 1, name: 'No Poverty' },
  { id: 2, name: 'Zero Hunger' },
  { id: 3, name: 'Good Health and Well-being' },
  { id: 4, name: 'Quality Education' },
  { id: 5, name: 'Gender Equality' },
  { id: 6, name: 'Clean Water and Sanitation' },
  { id: 7, name: 'Affordable and Clean Energy' },
  { id: 8, name: 'Decent Work and Economic Growth' },
  { id: 9, name: 'Industry, Innovation and Infrastructure' },
  { id: 10, name: 'Reduced Inequality' },
  { id: 11, name: 'Sustainable Cities and Communities' },
  { id: 12, name: 'Responsible Consumption and Production' },
  { id: 13, name: 'Climate Action' },
  { id: 14, name: 'Life Below Water' },
  { id: 15, name: 'Life on Land' },
  { id: 16, name: 'Peace, Justice and Strong Institutions' },
  { id: 17, name: 'Partnerships for the Goals' },
]

// ดึงรูปภาพจากเครื่อง
const getSdgImageUrl = (id: number) => {
  const paddedId = String(id).padStart(2, '0');
  return `/sdgs/E_WEB_${paddedId}.png`; 
}

export default function ProposalClient() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // ─── Form States ───
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedSDGs, setSelectedSDGs] = useState<number[]>([])
  const [background, setBackground] = useState('')
  const [summary, setSummary] = useState('')
  
  const pdfRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          window.location.href = '/login'
          return
        }
        setUser(user)

        const [projectsRes, usersRes] = await Promise.all([
          supabase.from('projects')
            .select('*')
            .ilike('manager_id', `%${user.user_metadata?.student_id}%`),
          supabase.from('users').select('*')
        ])
        
        setProjects(projectsRes.data || [])
        setAllUsers(usersRes.data || [])

        // ดึง Draft ที่บันทึกไว้ในเครื่อง
        const savedDraft = localStorage.getItem('samo_proposal_draft')
        if (savedDraft) {
          try {
            const { projectId, sdgs, bg, summ } = JSON.parse(savedDraft)
            setSelectedProjectId(projectId || '')
            setSelectedSDGs(sdgs || [])
            setBackground(bg || '')
            setSummary(summ || '')
          } catch (e) {
            console.error("Error loading draft", e)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Auto-save
  useEffect(() => {
    if (!loading) {
      const draft = {
        projectId: selectedProjectId,
        sdgs: selectedSDGs,
        bg: background,
        summ: summary
      }
      localStorage.setItem('samo_proposal_draft', JSON.stringify(draft))
    }
  }, [selectedProjectId, selectedSDGs, background, summary, loading])

  const toggleSDG = (id: number) => {
    setSelectedSDGs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleReset = () => {
    if (confirm('คุณต้องการล้างข้อมูลที่เขียนค้างไว้ทั้งหมดใช่หรือไม่?')) {
      setSelectedProjectId('')
      setSelectedSDGs([])
      setBackground('')
      setSummary('')
      localStorage.removeItem('samo_proposal_draft')
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // 🚀 ฟังก์ชันดาวน์โหลด PDF
  const handleDownloadPDF = async () => {
    if (!selectedProjectId) return alert('กรุณาเลือกโครงการที่ต้องการเขียน Proposal')
    if (!pdfRef.current) return

    setIsGenerating(true)
    let prevStyle:
      | {
          display: string
          position: string
          top: string
          left: string
          zIndex: string
        }
      | null = null
    
    try {
      let htmlToImage: any;
      let jsPDF: any;
      try {
        htmlToImage = await import('html-to-image');
        const jspdfModule = await import('jspdf');
        jsPDF = jspdfModule.default || jspdfModule.jsPDF || jspdfModule;
      } catch (err) {
        alert('ไม่พบไลบรารี กรุณาเปิด Terminal แล้วรัน: npm install html-to-image jspdf');
        setIsGenerating(false);
        return;
      }

      const element = pdfRef.current;
      prevStyle = {
        display: element.style.display,
        position: element.style.position,
        top: element.style.top,
        left: element.style.left,
        zIndex: element.style.zIndex,
      };
      
      // ดึงกระดาษออกมาวางนอกจอเพื่อให้เอนจินวาดภาพ
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.zIndex = '-9999';
      
      // รอให้ฟอนต์โหลดครบก่อนแคปเจอร์ (กันข้อความซ้อน/metrics เพี้ยน)
      await (document as any).fonts?.ready;
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 🚀 ถ่ายภาพด้วย html-to-image พร้อมเกราะป้องกัน CORS
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2, 
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const rect = element.getBoundingClientRect();
      const sourceWidth = rect.width || element.offsetWidth;
      const sourceHeight = rect.height || element.offsetHeight;
      if (!sourceWidth || !sourceHeight) {
        throw new Error('ไม่สามารถคำนวณขนาดหน้าเอกสารได้ (element มีขนาดเป็น 0)');
      }
      const pdfHeight = (sourceHeight * pdfWidth) / sourceWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Proposal_${selectedProject?.name_th || 'Document'}.pdf`);
      
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ${error.message || error}`);
    } finally {
      const element = pdfRef.current;
      if (element && prevStyle) {
        element.style.display = prevStyle.display;
        element.style.position = prevStyle.position;
        element.style.top = prevStyle.top;
        element.style.left = prevStyle.left;
        element.style.zIndex = prevStyle.zIndex;
      }
      setIsGenerating(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar user={user} activePage="proposal" onLogout={() => supabase.auth.signOut()} />
      <MobileNav activePage={'proposal' as any} user={user} />

      <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0 relative">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
              <Sparkles className="text-amber-500" size={28} /> เขียนโครงการ (Beta)
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleReset}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="ล้างข้อมูลทั้งหมด"
              >
                <RotateCcw size={20} />
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={!selectedProjectId || isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-100"
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" /> กำลังสร้าง PDF...</>
                ) : (
                  <><Download size={18} /> โหลดไฟล์ PDF</>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-5xl mx-auto relative z-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">เลือกโครงการ</label>
                  <div className="relative">
                    <select 
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="">-- เลือกโครงการที่คุณดูแล --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name_th}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">SDGs ที่เกี่ยวข้อง (คลิกเพื่อเลือก)</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-5 gap-3">
                    {SDGS.map(sdg => (
                      <button
                        key={sdg.id}
                        onClick={() => toggleSDG(sdg.id)}
                        title={sdg.name}
                        className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${selectedSDGs.includes(sdg.id) ? 'scale-110 shadow-lg ring-4 ring-blue-500 z-10' : 'hover:scale-105 hover:shadow-md opacity-70 hover:opacity-100'}`}
                      >
                        <img 
                          src={getSdgImageUrl(sdg.id)} 
                          alt={sdg.name} 
                          className="w-full h-full object-cover"
                        />
                        {selectedSDGs.includes(sdg.id) && (
                          <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">ที่มาและความสำคัญ</label>
                    <span className={`text-[10px] font-bold ${background.length > 1500 ? 'text-red-500' : 'text-gray-400'}`}>
                      {background.length} / 1500 ตัวอักษร
                    </span>
                  </div>
                  <textarea 
                    rows={6}
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    placeholder="ระบุที่มา วัตถุประสงค์ หรือปัญหาที่ต้องการแก้ไข..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">สรุปโครงการ</label>
                    <span className={`text-[10px] font-bold ${summary.length > 1500 ? 'text-red-500' : 'text-gray-400'}`}>
                      {summary.length} / 1500 ตัวอักษร
                    </span>
                  </div>
                  <textarea 
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="สรุปผลที่คาดว่าจะได้รับ หรือภาพรวมโครงการ..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
               <div className="sticky top-28 bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden aspect-[1/1.414] scale-95 origin-top">
                  <div className="p-10 h-full overflow-y-auto custom-scrollbar">
                     <p className="text-center text-[10px] text-gray-400 mb-8 uppercase tracking-[0.2em] font-bold">Project Proposal Preview</p>
                     <ProjectSheet 
                        project={selectedProject} 
                        allUsers={allUsers}
                        sdgs={selectedSDGs} 
                        background={background} 
                        summary={summary} 
                     />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* ── กระดาษ A4 สำหรับสร้าง PDF (ซ่อนไว้นอกจอ) ── */}
        <div className="fixed top-0 left-[-9999px] -z-50 pointer-events-none">
          <div 
            ref={pdfRef} 
            className="bg-white text-gray-900"
            style={{ width: '794px', minHeight: '1123px', padding: '60px', display: 'none' }}
          >
            <ProjectSheet 
              project={selectedProject} 
              allUsers={allUsers}
              sdgs={selectedSDGs} 
              background={background} 
              summary={summary} 
            />
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  )
}

// ─── Sub-Component: The A4 Project Sheet ──────────────────────────────────────
function ProjectSheet({ project, allUsers, sdgs, background, summary }: any) {
  
  const managerIds = project?.manager_id ? project.manager_id.split(',').map((id:string) => id.trim()) : [];
  const president = allUsers.find((u:any) => u.department === 'นายกสโมสร');
  const presidentStudentId = president?.student_id;
  const isPresidentAlsoManager = !!(presidentStudentId && managerIds.includes(presidentStudentId));
  const projectManagers = managerIds
    .filter((id: string) => id && id !== presidentStudentId)
    .map((id: string) => allUsers.find((u: any) => u.student_id === id))
    .filter(Boolean);

  const safeStyles = {
    textColor: { color: '#111827' },
    textMuted: { color: '#6B7280' },
    bgBlue: { backgroundColor: '#2563EB' },
    bgGray: { backgroundColor: '#111827' },
    borderGray: { borderColor: '#111827' },
    borderLight: { borderColor: '#D1D5DB' }
  };

  return (
    <div className="font-sans leading-relaxed flex flex-col min-h-full bg-white" style={safeStyles.textColor}>
      <div className="flex justify-center mb-8">
        <div 
          className="border-2 px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest"
          style={safeStyles.borderGray}
        >
          Samo Project Proposal
        </div>
      </div>

      <h1 className="text-3xl font-black text-center mb-4 leading-tight">
        {project?.name_th || 'ชื่อโครงการของคุณ'}
      </h1>
      
      <div className="w-20 h-1.5 mx-auto mb-10 rounded-full" style={safeStyles.bgBlue} />

      <div className="mb-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-center mb-4" style={safeStyles.textMuted}>
          SDGs Contribution
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {sdgs.length === 0 ? (
             <div className="italic text-xs" style={safeStyles.textMuted}>ไม่ได้เลือก SDGs</div>
          ) : (
            sdgs.sort((a:number, b:number) => a - b).map((id: number) => {
              const sdg = SDGS.find(s => s.id === id)
              return (
                <div key={id} className="flex flex-col items-center gap-1.5 w-14">
                   <div className="w-14 h-14 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                     <img 
                       src={getSdgImageUrl(id)} 
                       alt={sdg?.name} 
                       className="w-full h-full object-cover"
                     />
                   </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 flex-1">
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold" style={safeStyles.bgGray}>1</div>
            <h3 className="font-black text-lg">ที่มาและความสำคัญ</h3>
          </div>
          <div className="pl-10 pr-2 text-sm whitespace-pre-wrap leading-relaxed text-justify break-words">
            {background || 'เนื้อหาในส่วนที่มาและความสำคัญจะแสดงตรงนี้...'}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold" style={safeStyles.bgGray}>2</div>
            <h3 className="font-black text-lg">บทสรุปโครงการ</h3>
          </div>
          <div className="pl-10 pr-2 text-sm whitespace-pre-wrap leading-relaxed text-justify break-words">
            {summary || 'เนื้อหาในส่วนบทสรุปโครงการจะแสดงตรงนี้...'}
          </div>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t flex flex-col gap-8" style={safeStyles.borderLight}>
         <div className="flex flex-wrap justify-center gap-x-8 gap-y-10">
            {projectManagers.length > 0 ? projectManagers.map((mgr: any) => (
               <div key={mgr.student_id} className="text-center w-40">
                 <div className="w-full border-b mb-2" style={safeStyles.borderLight} />
                 <p className="font-bold text-xs">({mgr.full_name || mgr.student_id})</p>
                 <p className="text-[9px] mt-1 uppercase tracking-widest font-bold" style={safeStyles.textMuted}>ผู้รับผิดชอบโครงการ</p>
               </div>
            )) : !isPresidentAlsoManager ? (
               <div className="text-center w-40">
                 <div className="w-full border-b mb-2" style={safeStyles.borderLight} />
                 <p className="font-bold text-xs">(...........................................)</p>
                 <p className="text-[9px] mt-1 uppercase tracking-widest font-bold" style={safeStyles.textMuted}>ผู้รับผิดชอบโครงการ</p>
               </div>
            ) : null}
         </div>

         {president && (
            <div className="flex justify-center mt-2">
               <div className="text-center w-48">
                 <div className="w-full border-b mb-2" style={safeStyles.borderLight} />
                 <p className="font-bold text-xs">({president.full_name || president.student_id})</p>
                 <p className="text-[9px] mt-1 uppercase tracking-widest font-bold" style={safeStyles.textMuted}>นายกสโมสรนักศึกษาคณะวิทยาศาสตร์</p>
               </div>
            </div>
         )}
         
         <p className="text-[8px] text-center mt-4" style={safeStyles.textMuted}>Generated by Samo Schedule (Beta)</p>
      </div>
    </div>
  )
}
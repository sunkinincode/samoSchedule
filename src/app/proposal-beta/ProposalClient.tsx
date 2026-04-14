'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProposalDoc } from '@/lib/proposal-schema'
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
  const [nameEn, setNameEn] = useState('')
  const [academicYear, setAcademicYear] = useState(() => String(new Date().getFullYear() + 543)) // พ.ศ. โดยประมาณ
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [location, setLocation] = useState('')
  const [projectCategory, setProjectCategory] = useState('')
  const [graduateAttributes, setGraduateAttributes] = useState<string[]>([])
  const [studentActivityGroup, setStudentActivityGroup] = useState('')
  const [studentActivityType, setStudentActivityType] = useState('')
  const [studentActivityHours, setStudentActivityHours] = useState<string>('')
  const [holistic5h, setHolistic5h] = useState<string[]>([])

  const [advisors, setAdvisors] = useState<Array<{ full_name: string; role_label?: string; department?: string }>>([])

  const [sdgDetails, setSdgDetails] = useState<Record<number, { goal_text?: string; how_text?: string }>>({})
  const [objectives, setObjectives] = useState<string[]>([])
  const [kpis, setKpis] = useState<string[]>([])
  const [participants, setParticipants] = useState<{ club?: string; sci?: string; staff?: string; public?: string }>({})

  const [subActivities, setSubActivities] = useState<Array<{ title: string; detail?: string }>>([])
  const [agenda, setAgenda] = useState<Array<{ date?: string; start_time?: string; end_time?: string; title: string }>>([])
  const [workplan, setWorkplan] = useState<Array<{ date?: string; activity: string; owner?: string }>>([])

  const [sustainable, setSustainable] = useState<Record<number, { checked: boolean; note?: string }>>({})
  const [pdca, setPdca] = useState<{ plan: string; do: string; check: string; act: string }>({ plan: '', do: '', check: '', act: '' })

  const [budgetRequested, setBudgetRequested] = useState<string>('')
  const [budgetCategories, setBudgetCategories] = useState<Array<{ name: string; items: Array<{ name: string; quantity?: string; unit_price?: string; note?: string }> }>>([])
  const [fundingSources, setFundingSources] = useState<Array<{ label: string; amount?: string }>>([])
  const [budgetNote, setBudgetNote] = useState<string>('')
  const [expectedResults, setExpectedResults] = useState<string[]>([])
  const [evaluationMethods, setEvaluationMethods] = useState<string[]>([])
  
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
          (async () => {
            const sid = user.user_metadata?.student_id
            const { data: pm, error: pmErr } = await supabase
              .from('project_managers')
              .select('project_id')
              .eq('student_id', sid)
            let ids = (pm || []).map((r: any) => r.project_id)
            if (pmErr) {
              console.warn('project_managers unavailable, fallback to projects.manager_id', pmErr)
              const { data: legacy } = await supabase
                .from('projects')
                .select('id')
                .ilike('manager_id', `%${sid}%`)
              ids = (legacy || []).map((p: any) => p.id)
            }
            if (!ids.length) return { data: [] as any[] }
            return await supabase
              .from('projects')
              .select('id, name_th, manager_id')
              .in('id', ids)
          })(),
          supabase.from('users').select('id, full_name, student_id, department, role, avatar_url')
        ])
        
        setProjects(projectsRes.data || [])
        setAllUsers(usersRes.data || [])

        // ดึง Draft ที่บันทึกไว้ในเครื่อง
        const savedDraft = localStorage.getItem('samo_proposal_draft')
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft)
            const { projectId, sdgs, bg, summ } = parsed
            setSelectedProjectId(projectId || '')
            setSelectedSDGs(sdgs || [])
            setBackground(bg || '')
            setSummary(summ || '')
            setNameEn(parsed.nameEn || '')
            setAcademicYear(parsed.academicYear || String(new Date().getFullYear() + 543))
            setDateStart(parsed.dateStart || '')
            setDateEnd(parsed.dateEnd || '')
            setLocation(parsed.location || '')
            setProjectCategory(parsed.projectCategory || '')
            setGraduateAttributes(parsed.graduateAttributes || [])
            setStudentActivityGroup(parsed.studentActivityGroup || '')
            setStudentActivityType(parsed.studentActivityType || '')
            setStudentActivityHours(parsed.studentActivityHours || '')
            setHolistic5h(parsed.holistic5h || [])
            setAdvisors(parsed.advisors || [])
            setSdgDetails(parsed.sdgDetails || {})
            setObjectives(parsed.objectives || [])
            setKpis(parsed.kpis || [])
            setParticipants(parsed.participants || {})
            setSubActivities(parsed.subActivities || [])
            setAgenda(parsed.agenda || [])
            setWorkplan(parsed.workplan || [])
            setSustainable(parsed.sustainable || {})
            setPdca(parsed.pdca || { plan: '', do: '', check: '', act: '' })
            setBudgetRequested(parsed.budgetRequested || '')
            setBudgetCategories(parsed.budgetCategories || [])
            setFundingSources(parsed.fundingSources || [])
            setBudgetNote(parsed.budgetNote || '')
            setExpectedResults(parsed.expectedResults || [])
            setEvaluationMethods(parsed.evaluationMethods || [])
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
        summ: summary,
        nameEn,
        academicYear,
        dateStart,
        dateEnd,
        location,
        projectCategory,
        graduateAttributes,
        studentActivityGroup,
        studentActivityType,
        studentActivityHours,
        holistic5h,
        advisors,
        sdgDetails,
        objectives,
        kpis,
        participants,
        subActivities,
        agenda,
        workplan,
        sustainable,
        pdca,
        budgetRequested,
        budgetCategories,
        fundingSources,
        budgetNote,
        expectedResults,
        evaluationMethods,
      }
      localStorage.setItem('samo_proposal_draft', JSON.stringify(draft))
    }
  }, [selectedProjectId, selectedSDGs, background, summary, nameEn, academicYear, dateStart, dateEnd, location, projectCategory, graduateAttributes, studentActivityGroup, studentActivityType, studentActivityHours, holistic5h, advisors, sdgDetails, objectives, kpis, participants, subActivities, agenda, workplan, sustainable, pdca, budgetRequested, budgetCategories, fundingSources, budgetNote, expectedResults, evaluationMethods, loading])

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
      setNameEn('')
      setAcademicYear(String(new Date().getFullYear() + 543))
      setDateStart('')
      setDateEnd('')
      setLocation('')
      setProjectCategory('')
      setGraduateAttributes([])
      setStudentActivityGroup('')
      setStudentActivityType('')
      setStudentActivityHours('')
      setHolistic5h([])
      setAdvisors([])
      setSdgDetails({})
      setObjectives([])
      setKpis([])
      setParticipants({})
      setSubActivities([])
      setAgenda([])
      setWorkplan([])
      setSustainable({})
      setPdca({ plan: '', do: '', check: '', act: '' })
      setBudgetRequested('')
      setBudgetCategories([])
      setFundingSources([])
      setBudgetNote('')
      setExpectedResults([])
      setEvaluationMethods([])
      localStorage.removeItem('samo_proposal_draft')
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const proposalDoc: ProposalDoc = {
    version: 1,
    project_id: selectedProjectId || undefined,
    cover: {
      title_th: selectedProject?.name_th || 'ชื่อโครงการ (ภาษาไทย)',
      title_en: nameEn || undefined,
      academic_year: academicYear || undefined,
      date_start: dateStart || undefined,
      date_end: dateEnd || undefined,
      buddhist_year: academicYear || undefined,
      location: location || undefined,
    },
    classification: {
      category: (projectCategory as any) || undefined,
      graduate_attributes: graduateAttributes.length ? (graduateAttributes as any) : [],
      student_activity_60up: studentActivityGroup
        ? {
            group: studentActivityGroup as any,
            type_label: studentActivityType || undefined,
            hours: studentActivityHours ? Number(studentActivityHours) : undefined,
          }
        : undefined,
      holistic_5h: holistic5h.length ? (holistic5h as any) : [],
    },
    people: {
      owners: [],
      advisors: advisors.map(a => ({ full_name: a.full_name, role_label: a.role_label, department: a.department })),
      president: allUsers.find((u: any) => u.department === 'นายกสโมสร')
        ? {
            full_name: allUsers.find((u: any) => u.department === 'นายกสโมสร')?.full_name,
            student_id: allUsers.find((u: any) => u.department === 'นายกสโมสร')?.student_id,
            department: 'นายกสโมสร',
          }
        : undefined,
    },
    rationale: background || undefined,
    sdgs: selectedSDGs.map((id) => ({ sdg_id: id, goal_text: sdgDetails?.[id]?.goal_text, how_text: sdgDetails?.[id]?.how_text })),
    objectives: objectives.filter(Boolean).map(text => ({ text })),
    kpis: kpis.filter(Boolean).map(text => ({ text })),
    participants: {
      club_count: participants.club ? Number(participants.club) : undefined,
      sci_students_count: participants.sci ? Number(participants.sci) : undefined,
      staff_count: participants.staff ? Number(participants.staff) : undefined,
      public_count: participants.public ? Number(participants.public) : undefined,
    },
    activities: {
      sub_activities: subActivities.filter(a => a.title?.trim()).map(a => ({ title: a.title, detail: a.detail })),
      agenda: agenda.filter(a => a.title?.trim()).map(a => ({ date: a.date, start_time: a.start_time, end_time: a.end_time, title: a.title })),
      workplan: workplan.filter(w => w.activity?.trim()).map(w => ({ date: w.date, activity: w.activity, owner: w.owner })),
    },
    sustainable_guidelines: Array.from({ length: 25 }, (_, i) => i + 1).map((id) => ({
      id: id as any,
      checked: sustainable?.[id]?.checked || false,
      note: sustainable?.[id]?.note || undefined,
    })),
    pdca: {
      plan: pdca.plan || undefined,
      do: pdca.do || undefined,
      check: pdca.check || undefined,
      act: pdca.act || undefined,
    },
    budget: {
      requested_amount: budgetRequested ? Number(budgetRequested) : undefined,
      categories: budgetCategories.map(c => ({
        name: c.name,
        items: c.items.filter(it => it.name?.trim()).map(it => ({
          name: it.name,
          quantity: it.quantity ? Number(it.quantity) : undefined,
          unit_price: it.unit_price ? Number(it.unit_price) : undefined,
          note: it.note || undefined,
        })),
      })),
      funding_sources: fundingSources.filter(f => f.label?.trim()).map(f => ({
        label: f.label,
        amount: f.amount ? Number(f.amount) : undefined,
      })),
      note: budgetNote || undefined,
    },
    expected_results: expectedResults.filter(Boolean),
    evaluation_methods: evaluationMethods.filter(Boolean),
  }

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
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // ถ้าเป็นพรีวิวหลายหน้า ให้จับภาพทีละหน้า (กัน layout พัง/ตัดหน้าไม่ตรง)
      const pages = Array.from(element.querySelectorAll('[data-pdf-page]')) as HTMLElement[];
      const targets = pages.length ? pages : [element];

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < targets.length; i++) {
        const pageEl = targets[i];
        const pageDataUrl = await htmlToImage.toJpeg(pageEl, {
          quality: 0.92,
          backgroundColor: '#ffffff',
          // ลดขนาดไฟล์โดยยังคมชัด: 1.5–2 เป็นจุดสมดุล (A4)
          pixelRatio: 1.6,
          cacheBust: true,
        });

        if (i > 0) pdf.addPage();
        // ใช้ JPEG + FAST compression จะลดไฟล์ลงมากโดยแทบไม่เสียคุณภาพตัวอักษร
        pdf.addImage(pageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">ชื่อโครงการ (อังกฤษ)</label>
                    <input
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder="Project title (EN)"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">ปีการศึกษา (พ.ศ.)</label>
                    <input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2569"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">เริ่มวันที่</label>
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">ถึงวันที่</label>
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">สถานที่</label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="ณ (สถานที่)"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
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

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">วัตถุประสงค์</label>
                  <button
                    type="button"
                    onClick={() => setObjectives(prev => [...prev, ''])}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + เพิ่มข้อ
                  </button>
                </div>
                {(objectives.length ? objectives : ['']).map((v, idx) => (
                  <input
                    key={idx}
                    value={objectives[idx] ?? ''}
                    onChange={(e) => setObjectives(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
                    placeholder={`ข้อที่ ${idx + 1} เช่น เพื่อ...`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ))}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">ตัวชี้วัดความสำเร็จของโครงการ</label>
                  <button
                    type="button"
                    onClick={() => setKpis(prev => [...prev, ''])}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + เพิ่มข้อ
                  </button>
                </div>
                {(kpis.length ? kpis : ['']).map((v, idx) => (
                  <input
                    key={idx}
                    value={kpis[idx] ?? ''}
                    onChange={(e) => setKpis(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
                    placeholder={`ข้อที่ ${idx + 1} เช่น นักศึกษาเข้าร่วมอย่างน้อย ... คน`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ))}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">วิธีการประเมินผล</label>
                  <button
                    type="button"
                    onClick={() => setEvaluationMethods(prev => [...prev, ''])}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + เพิ่มข้อ
                  </button>
                </div>
                {(evaluationMethods.length ? evaluationMethods : ['']).map((v, idx) => (
                  <input
                    key={idx}
                    value={evaluationMethods[idx] ?? ''}
                    onChange={(e) => setEvaluationMethods(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
                    placeholder={`ข้อที่ ${idx + 1} เช่น แบบประเมินความพึงพอใจ`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ))}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">ผลที่คาดว่าจะได้รับ</label>
                  <button
                    type="button"
                    onClick={() => setExpectedResults(prev => [...prev, ''])}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + เพิ่มข้อ
                  </button>
                </div>
                {(expectedResults.length ? expectedResults : ['']).map((v, idx) => (
                  <input
                    key={idx}
                    value={expectedResults[idx] ?? ''}
                    onChange={(e) => setExpectedResults(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
                    placeholder={`ข้อที่ ${idx + 1} เช่น ผู้เข้าร่วมได้รับความรู้/ทักษะ...`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ))}
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
                        doc={proposalDoc}
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
              doc={proposalDoc}
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
function ProjectSheet({ project, allUsers, sdgs, background, summary, doc }: any) {
  const typedDoc: ProposalDoc | undefined = doc
  const cover = typedDoc?.cover
  const objectives = typedDoc?.objectives || []
  const kpis = typedDoc?.kpis || []
  const expected = typedDoc?.expected_results || []
  const evalMethods = typedDoc?.evaluation_methods || []
  const coverDateStart = cover?.date_start
  const coverDateEnd = cover?.date_end
  
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

  const formatThaiBuddhistDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    const fmt = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const parts = fmt.formatToParts(d)
    const day = parts.find(p => p.type === 'day')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const year = parts.find(p => p.type === 'year')?.value
    if (!day || !month || !year) return fmt.format(d)
    return `${day} ${month} พ.ศ. ${year}`
  }

  const bodyTextClass = (text: string) => {
    const n = (text || '').trim().length
    if (n > 1350) return 'text-[12px] leading-[1.65]'
    if (n > 1050) return 'text-[13px] leading-[1.65]'
    return 'text-sm leading-[1.7]'
  }

  const A4 = ({ children, pageNumber }: { children: any; pageNumber: number }) => (
    <div
      className="bg-white text-gray-900"
      data-pdf-page
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '60px',
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
      }}
    >
      <div className="font-sans leading-relaxed flex flex-col min-h-full" style={safeStyles.textColor}>
        {children}
        <div className="mt-auto pt-6">
          <p className="text-[8px] text-center" style={safeStyles.textMuted}>
            หน้า {pageNumber}
          </p>
        </div>
      </div>
    </div>
  )

  const SDGBadges = () => (
    <div className="flex flex-wrap justify-center gap-4">
      {sdgs.length === 0 ? (
        <div className="italic text-xs" style={safeStyles.textMuted}>ไม่ได้เลือก SDGs</div>
      ) : (
        sdgs.sort((a:number, b:number) => a - b).map((id: number) => {
          const sdg = SDGS.find(s => s.id === id)
          return (
            <div key={id} className="flex flex-col items-center gap-1.5 w-14">
              <div className="w-14 h-14 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <img src={getSdgImageUrl(id)} alt={sdg?.name} className="w-full h-full object-cover" />
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  const SignatureBlock = () => (
    <div className="mt-10 pt-8 border-t flex flex-col gap-8" style={safeStyles.borderLight}>
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
          <div className="text-center w-56">
            <div className="w-full border-b mb-2" style={safeStyles.borderLight} />
            <p className="font-bold text-xs">({president.full_name || president.student_id})</p>
            <p className="text-[9px] mt-1 uppercase tracking-widest font-bold" style={safeStyles.textMuted}>
              นายกสโมสรนักศึกษาคณะวิทยาศาสตร์
            </p>
            <p className="text-[8px] mt-1" style={safeStyles.textMuted}>
              (ให้ประทับตราสโมสร ฯ ทับลายมือชื่อ)
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white">
      <A4 pageNumber={1}>
        <div className="flex justify-center mb-6">
          <div className="border-2 px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest" style={safeStyles.borderGray}>
            รูปแบบโครงการกิจกรรมนักศึกษา
          </div>
        </div>

        <h1 className="text-3xl font-black text-center mb-3 leading-tight">
          {cover?.title_th || project?.name_th || 'ชื่อโครงการ (ภาษาไทย)'}
        </h1>
        <p className="text-center text-sm font-semibold mb-4" style={safeStyles.textMuted}>
          {cover?.title_en ? `(${cover.title_en})` : 'ชื่อโครงการ (ภาษาอังกฤษ)'}
        </p>

        <div className="flex justify-center mb-8">
          <div className="text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
            ปีการศึกษา {cover?.academic_year || '..............'} · จัดกิจกรรมระหว่างวันที่ {formatThaiBuddhistDate(coverDateStart) || '..............'} – {formatThaiBuddhistDate(coverDateEnd) || '..............'} · ณ {cover?.location || '..............'}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-center mb-3" style={safeStyles.textMuted}>
            SDGs
          </p>
          <SDGBadges />
        </div>

        <div className="grid grid-cols-1 gap-7">
          <section>
            <h3 className="font-black text-lg mb-2">หลักการและเหตุผล</h3>
            <div className={`${bodyTextClass(background)} whitespace-pre-wrap break-words text-left`}>
              {background || '...................................................................................................................'}
            </div>
          </section>

          <section>
            <h3 className="font-black text-lg mb-2">บทสรุปโครงการ</h3>
            <div className={`${bodyTextClass(summary)} whitespace-pre-wrap break-words text-left`}>
              {summary || '...................................................................................................................'}
            </div>
          </section>
        </div>
      </A4>

      <A4 pageNumber={2}>
        <h2 className="text-2xl font-black mb-6">วัตถุประสงค์ / ตัวชี้วัด / วิธีประเมินผล</h2>

        <section className="mb-6">
          <h3 className="font-black text-lg mb-2">วัตถุประสงค์</h3>
          <ol className="list-decimal pl-6 space-y-1 text-sm">
            {(objectives.length ? objectives : [{ text: 'เพื่อ..........................................................' }]).map((o: any, i: number) => (
              <li key={i} className="break-words">{o.text}</li>
            ))}
          </ol>
        </section>

        <section className="mb-6">
          <h3 className="font-black text-lg mb-2">ตัวชี้วัดความสำเร็จของโครงการ</h3>
          <ol className="list-decimal pl-6 space-y-1 text-sm">
            {(kpis.length ? kpis : [{ text: 'นักศึกษาเข้าร่วมโครงการ..................................อย่างน้อย ........ คน' }]).map((k: any, i: number) => (
              <li key={i} className="break-words">{k.text}</li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h3 className="font-black text-lg mb-2">วิธีการประเมินผล</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            {(evalMethods.length ? evalMethods : ['แบบประเมินความพึงพอใจ', 'นับจำนวนผู้เข้าร่วม']).map((t: string, i: number) => (
              <li key={i} className="break-words">{t}</li>
            ))}
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="font-black text-lg mb-2">ผลที่คาดว่าจะได้รับ</h3>
          <ol className="list-decimal pl-6 space-y-1 text-sm">
            {(expected.length ? expected : ['.............................................................................']).map((t: string, i: number) => (
              <li key={i} className="break-words">{t}</li>
            ))}
          </ol>
        </section>

        <SignatureBlock />
      </A4>
    </div>
  )
}
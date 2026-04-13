'use client'
import dynamic from 'next/dynamic'

// โหลด Component หลักโดยปิด SSR (หลีกเลี่ยงปัญหา jsPDF Module not found)
const ProposalClient = dynamic(() => import('./ProposalClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
})

export default function ProposalBetaPage() {
  return <ProposalClient />
}
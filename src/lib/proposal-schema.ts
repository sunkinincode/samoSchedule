export type ProjectCategory =
  | 'บำเพ็ญประโยชน์รักษาสิ่งแวดล้อม'
  | 'วิชาการ'
  | 'ศิลปวัฒนธรรม'
  | 'กีฬาและส่งเสริมสุขภาพ'
  | 'นันทนาการ'
  | 'ส่งเสริมประชาธิปไตย'
  | 'คุณธรรม จริยธรรมและความเป็นไทย'
  | 'สร้างภูมิคุ้มกันภัยจากยาเสพติด'
  | 'อื่นๆ'

export type GraduateAttribute =
  | 'คุณธรรม'
  | 'ปัญญา'
  | 'จิตอาสา'
  | 'ทำงานอย่างมืออาชีพ'

export type Holistic5H =
  | 'Critical thinking & Complex problem solving'
  | 'Communications, Information, and Media Literacy'
  | 'Innovative thinking and Entrepreneurial mindset'
  | 'Technology Literacy & Communication skills'
  | 'Emotional intelligence & Professional behavior'
  | 'Social Engagement'

export type SustainableGuidelineId =
  | 1 | 2 | 3 | 4 | 5
  | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15
  | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25

export interface ProposalPerson {
  full_name?: string
  student_id?: string
  phone?: string
  role_label?: string
  department?: string
}

export interface ProposalSdgGoal {
  sdg_id: number // 1..17
  goal_text?: string // "เป้าหมายที่ ... คือ ..."
  how_text?: string // "โดย ..."
}

export interface ProposalObjective {
  text: string
}

export interface ProposalKpi {
  text: string
  target?: string
  unit?: string
  type?: 'quantitative' | 'qualitative'
}

export interface ProposalParticipants {
  club_count?: number
  sci_students_count?: number
  staff_count?: number
  public_count?: number
}

export interface ProposalSubActivity {
  title: string
  detail?: string
}

export interface ProposalAgendaItem {
  date?: string // YYYY-MM-DD
  start_time?: string // HH:mm
  end_time?: string // HH:mm
  title: string
}

export interface ProposalWorkplanItem {
  date?: string // YYYY-MM-DD
  activity: string
  owner?: string
}

export interface ProposalPdca {
  plan?: string
  do?: string
  check?: string
  act?: string
}

export interface ProposalBudgetItem {
  name: string
  quantity?: number
  unit_price?: number
  note?: string
}

export interface ProposalBudgetCategory {
  name: string
  items: ProposalBudgetItem[]
}

export interface ProposalFundingSource {
  label: string
  amount?: number
}

export interface ProposalDocV1 {
  version: 1
  project_id?: string

  cover: {
    title_th: string
    title_en?: string
    academic_year?: string
    date_start?: string // YYYY-MM-DD
    date_end?: string // YYYY-MM-DD
    buddhist_year?: string
    location?: string
  }

  classification: {
    category?: ProjectCategory
    graduate_attributes?: GraduateAttribute[]
    student_activity_60up?: {
      group?: 'เสริมสร้างสมรรถนะ' | 'เลือกเข้าร่วมตามความสนใจ'
      type_label?: string
      hours?: number
    }
    holistic_5h?: Holistic5H[]
  }

  people: {
    owners?: ProposalPerson[]
    advisors?: ProposalPerson[]
    president?: ProposalPerson
  }

  rationale?: string // หลักการและเหตุผล
  sdgs?: ProposalSdgGoal[]
  objectives?: ProposalObjective[]
  kpis?: ProposalKpi[]
  participants?: ProposalParticipants

  activities?: {
    sub_activities?: ProposalSubActivity[]
    agenda?: ProposalAgendaItem[]
    workplan?: ProposalWorkplanItem[]
  }

  sustainable_guidelines?: Array<{
    id: SustainableGuidelineId
    checked: boolean
    note?: string
  }>

  pdca?: ProposalPdca

  budget?: {
    requested_amount?: number
    categories?: ProposalBudgetCategory[]
    funding_sources?: ProposalFundingSource[]
    note?: string
  }

  expected_results?: string[]
  evaluation_methods?: string[]

  // Internal metadata (optional)
  updated_at?: string
}

export type ProposalDoc = ProposalDocV1

// Lightweight JSON Schema (Draft 2020-12 compatible shape)
export const proposalDocJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://samo-schedule.local/schemas/proposal-doc-v1.json',
  title: 'ProposalDocV1',
  type: 'object',
  required: ['version', 'cover', 'classification', 'people'],
  additionalProperties: false,
  properties: {
    version: { const: 1 },
    project_id: { type: 'string' },
    cover: {
      type: 'object',
      additionalProperties: false,
      required: ['title_th'],
      properties: {
        title_th: { type: 'string', minLength: 1 },
        title_en: { type: 'string' },
        academic_year: { type: 'string' },
        date_start: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        date_end: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        buddhist_year: { type: 'string' },
        location: { type: 'string' },
      },
    },
    classification: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category: { type: 'string' },
        graduate_attributes: { type: 'array', items: { type: 'string' } },
        student_activity_60up: {
          type: 'object',
          additionalProperties: false,
          properties: {
            group: { type: 'string' },
            type_label: { type: 'string' },
            hours: { type: 'number' },
          },
        },
        holistic_5h: { type: 'array', items: { type: 'string' } },
      },
    },
    people: {
      type: 'object',
      additionalProperties: false,
      properties: {
        owners: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              full_name: { type: 'string' },
              student_id: { type: 'string' },
              phone: { type: 'string' },
              role_label: { type: 'string' },
              department: { type: 'string' },
            },
          },
        },
        advisors: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              full_name: { type: 'string' },
              student_id: { type: 'string' },
              phone: { type: 'string' },
              role_label: { type: 'string' },
              department: { type: 'string' },
            },
          },
        },
        president: {
          type: 'object',
          additionalProperties: false,
          properties: {
            full_name: { type: 'string' },
            student_id: { type: 'string' },
            phone: { type: 'string' },
            role_label: { type: 'string' },
            department: { type: 'string' },
          },
        },
      },
    },
    rationale: { type: 'string' },
    sdgs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sdg_id'],
        properties: {
          sdg_id: { type: 'number', minimum: 1, maximum: 17 },
          goal_text: { type: 'string' },
          how_text: { type: 'string' },
        },
      },
    },
    objectives: { type: 'array', items: { type: 'object', required: ['text'], properties: { text: { type: 'string' } }, additionalProperties: false } },
    kpis: { type: 'array', items: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, target: { type: 'string' }, unit: { type: 'string' }, type: { type: 'string' } }, additionalProperties: false } },
    participants: {
      type: 'object',
      additionalProperties: false,
      properties: {
        club_count: { type: 'number' },
        sci_students_count: { type: 'number' },
        staff_count: { type: 'number' },
        public_count: { type: 'number' },
      },
    },
    activities: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sub_activities: { type: 'array', items: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, detail: { type: 'string' } }, additionalProperties: false } },
        agenda: { type: 'array', items: { type: 'object', required: ['title'], properties: { date: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, title: { type: 'string' } }, additionalProperties: false } },
        workplan: { type: 'array', items: { type: 'object', required: ['activity'], properties: { date: { type: 'string' }, activity: { type: 'string' }, owner: { type: 'string' } }, additionalProperties: false } },
      },
    },
    sustainable_guidelines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'checked'],
        properties: {
          id: { type: 'number', minimum: 1, maximum: 25 },
          checked: { type: 'boolean' },
          note: { type: 'string' },
        },
      },
    },
    pdca: {
      type: 'object',
      additionalProperties: false,
      properties: {
        plan: { type: 'string' },
        do: { type: 'string' },
        check: { type: 'string' },
        act: { type: 'string' },
      },
    },
    budget: {
      type: 'object',
      additionalProperties: false,
      properties: {
        requested_amount: { type: 'number' },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'items'],
            properties: {
              name: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    quantity: { type: 'number' },
                    unit_price: { type: 'number' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        funding_sources: { type: 'array', items: { type: 'object', required: ['label'], properties: { label: { type: 'string' }, amount: { type: 'number' } }, additionalProperties: false } },
        note: { type: 'string' },
      },
    },
    expected_results: { type: 'array', items: { type: 'string' } },
    evaluation_methods: { type: 'array', items: { type: 'string' } },
    updated_at: { type: 'string' },
  },
} as const


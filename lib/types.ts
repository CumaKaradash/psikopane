// lib/types.ts

export type Profile = {
  id: string
  slug: string
  full_name: string
  title: string
  email: string | null
  phone: string | null
  bio: string | null
  session_types: string[]
  session_price: number
  avatar_url: string | null
  created_at: string
}

export type Client = {
  id: string
  psychologist_id: string
  full_name: string
  phone: string | null
  email: string | null
  session_type: string | null
  notes: string | null
  status: 'active' | 'passive' | 'new'
  created_at: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type Appointment = {
  id: string
  psychologist_id: string
  client_id: string | null
  guest_name: string | null
  guest_phone: string | null
  guest_email: string | null
  guest_note: string | null
  session_type: string
  starts_at: string
  duration_min: number
  status: AppointmentStatus
  price: number | null
  notes: string | null
  notify_consent: boolean
  push_subscription: object | null
  created_at: string
  // joined
  client?: Client
}

export type TestQuestion = {
  text: string
  options: { label: string; score: number }[]
}

export type Test = {
  id: string
  psychologist_id: string
  slug: string
  title: string
  description: string | null
  questions: TestQuestion[]
  is_active: boolean
  is_public: boolean
  created_at: string
}

export type TestResponse = {
  id: string
  test_id: string
  client_id: string | null
  respondent_name: string | null
  answers: { question_index: number; option_index: number; score: number }[]
  total_score: number | null
  completed_at: string
}

export type HomeworkQuestion = {
  text: string
}

export type Homework = {
  id: string
  psychologist_id: string
  slug: string
  title: string
  description: string | null
  questions: HomeworkQuestion[]
  due_date: string | null
  is_active: boolean
  created_at: string
}

export type HomeworkResponse = {
  id: string
  homework_id: string
  client_id: string | null
  respondent_name: string | null
  answers: { question_index: number; answer_text: string }[]
  completed_at: string
}

export type FinanceType = 'income' | 'expense'

export type FinanceEntry = {
  id: string
  psychologist_id: string
  type: FinanceType
  amount: number
  description: string
  appointment_id: string | null
  entry_date: string
  created_at: string
}

// API request/response helpers
export type BookingRequest = {
  guest_name: string
  guest_phone: string
  guest_email: string
  guest_note?: string
  session_type: string
  starts_at: string
}

export type PublicProfile = Pick<Profile, 'id' | 'slug' | 'full_name' | 'title' | 'bio' | 'session_types' | 'session_price' | 'avatar_url'>

// ── Network / Teams ───────────────────────────────────────────────────────────
export type TeamRole = 'owner' | 'member'

export type Team = {
  id:           string
  name:         string
  slug:         string        // klinik randevu URL'i: site.com/{slug}/booking
  description:  string | null
  owner_id:     string
  bio:          string | null
  session_types: string[]
  avatar_url:   string | null
  created_at:   string
  // joined
  members?: TeamMember[]
}

// Randevu sayfası için birleşik bağlam
export type BookingContext =
  | { type: 'individual'; profile: PublicProfile; team: null; teamMembers: null }
  | {
      type: 'team'
      profile: null
      team: Pick<Team, 'id' | 'slug' | 'name' | 'description' | 'session_types' | 'avatar_url'>
      teamMembers: TeamMemberForBooking[]
    }

export type TeamMemberForBooking = {
  psychologist_id: string
  role:            TeamRole
  profile: PublicProfile
}

export type TeamMemberStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'

export type TeamMember = {
  id:              string
  team_id:         string
  psychologist_id: string
  role:            TeamRole
  status:          TeamMemberStatus
  joined_at:       string
  // joined
  profile?: Pick<Profile, 'id' | 'full_name' | 'title' | 'slug' | 'avatar_url'>
}

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected'

export type Connection = {
  id:           string
  requester_id: string
  addressee_id: string
  status:       ConnectionStatus
  created_at:   string
  updated_at:   string
  // joined
  requester?: Pick<Profile, 'id' | 'full_name' | 'title' | 'slug'>
  addressee?: Pick<Profile, 'id' | 'full_name' | 'title' | 'slug'>
}

// ── Community / Public Tests ──────────────────────────────────────────────────
export type PublicTest = Test & {
  is_public:  boolean
  author?: Pick<Profile, 'id' | 'full_name' | 'slug'>
}

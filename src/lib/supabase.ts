import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface Certificate {
  id: string
  student_name: string
  roll_no: string
  course_name: string
  grade: string
  certificate_id: string
  institution_name: string
  issued_by: string
  issued_date: string
  certificate_hash: string
  is_revoked: boolean
  student_wallet?: string
  nft_mint?: string
  created_at: string
  updated_at: string
}

export interface Institution {
  id: string
  name: string
  location: string
  authority_wallet: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

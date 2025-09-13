import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface Certificate {
  id: string;
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  certificate_id: string;
  institution_name: string;
  issued_by: string;
  student_wallet: string;
  issued_date: string;
  certificate_hash: string;
  is_revoked: boolean;
  verification_count: number;
  institutions?: {
    name: string;
    logo_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  location: string;
  authority_wallet: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  roll_no: string;
  admission_date: string;
  wallet_address: string;
  institution_id: string;
  email?: string;
  phone?: string;
  course?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

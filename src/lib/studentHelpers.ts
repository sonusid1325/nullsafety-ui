import { supabase } from './supabase';

export interface GenerateRollNumberOptions {
  institutionId: string;
  prefix?: string;
  length?: number;
  startFrom?: number;
}

export const generateNextRollNumber = async ({
  institutionId,
  prefix = '',
  length = 3,
  startFrom = 1,
}: GenerateRollNumberOptions): Promise<string> => {
  try {
    // Get all existing roll numbers for this institution
    const { data: students, error } = await supabase
      .from('students')
      .select('roll_no')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching students for roll number generation:', error);
      // Fallback to a timestamp-based roll number
      return `${prefix}${Date.now().toString().slice(-length)}`;
    }

    if (!students || students.length === 0) {
      // First student
      return `${prefix}${String(startFrom).padStart(length, '0')}`;
    }

    // Extract numeric parts from roll numbers
    const numericParts = students
      .map(student => {
        // Remove prefix if it exists
        const withoutPrefix = prefix ? student.roll_no.replace(prefix, '') : student.roll_no;
        // Extract trailing numbers
        const match = withoutPrefix.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    if (numericParts.length === 0) {
      return `${prefix}${String(startFrom).padStart(length, '0')}`;
    }

    const maxNumber = Math.max(...numericParts);
    const nextNumber = Math.max(maxNumber + 1, startFrom);

    return `${prefix}${String(nextNumber).padStart(length, '0')}`;
  } catch (error) {
    console.error('Error generating roll number:', error);
    // Fallback to timestamp-based roll number
    return `${prefix}${Date.now().toString().slice(-length)}`;
  }
};

export interface ValidateStudentDataOptions {
  name: string;
  rollNo: string;
  walletAddress: string;
  admissionDate: string;
  institutionId: string;
  excludeId?: string; // For edit operations
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateStudentData = async ({
  name,
  rollNo,
  walletAddress,
  admissionDate,
  institutionId,
  excludeId,
}: ValidateStudentDataOptions): Promise<ValidationResult> => {
  const errors: string[] = [];

  // Basic validation
  if (!name.trim()) {
    errors.push('Name is required');
  }

  if (!rollNo.trim()) {
    errors.push('Roll number is required');
  }

  if (!walletAddress.trim()) {
    errors.push('Wallet address is required');
  } else if (walletAddress.length < 32 || walletAddress.length > 44) {
    errors.push('Invalid wallet address format');
  }

  if (!admissionDate) {
    errors.push('Admission date is required');
  } else {
    const date = new Date(admissionDate);
    const today = new Date();
    if (date > today) {
      errors.push('Admission date cannot be in the future');
    }
  }

  // Database validation
  try {
    // Check if roll number already exists
    let rollNoQuery = supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('roll_no', rollNo);

    if (excludeId) {
      rollNoQuery = rollNoQuery.neq('id', excludeId);
    }

    const { data: existingRollNo } = await rollNoQuery.single();

    if (existingRollNo) {
      errors.push('Roll number already exists');
    }

    // Check if wallet address is already used by another student in the same institution
    let walletQuery = supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('wallet_address', walletAddress);

    if (excludeId) {
      walletQuery = walletQuery.neq('id', excludeId);
    }

    const { data: existingWallet } = await walletQuery.single();

    if (existingWallet) {
      errors.push('This wallet address is already registered to another student');
    }
  } catch (error) {
    console.error('Error validating student data:', error);
    // Don't add validation errors for database issues
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const getStudentByRollNo = async (
  institutionId: string,
  rollNo: string
) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('roll_no', rollNo)
      .single();

    if (error) {
      console.error('Error fetching student by roll number:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getStudentByRollNo:', error);
    return null;
  }
};

export const getStudentByWallet = async (
  institutionId: string,
  walletAddress: string
) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error('Error fetching student by wallet:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getStudentByWallet:', error);
    return null;
  }
};

export const searchStudents = async (
  institutionId: string,
  searchTerm: string,
  limit: number = 50
) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('institution_id', institutionId)
      .or(`name.ilike.%${searchTerm}%,roll_no.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('roll_no', { ascending: true });

    if (error) {
      console.error('Error searching students:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchStudents:', error);
    return [];
  }
};

export const getStudentStats = async (institutionId: string) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('status')
      .eq('institution_id', institutionId);

    if (error) {
      console.error('Error fetching student stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
      };
    }

    const total = data.length;
    const active = data.filter(s => s.status === 'Active').length;
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  } catch (error) {
    console.error('Error in getStudentStats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
    };
  }
};

export const formatRollNumber = (rollNo: string, prefix?: string): string => {
  if (!rollNo) return '';

  if (prefix && rollNo.startsWith(prefix)) {
    return rollNo;
  }

  return prefix ? `${prefix}${rollNo}` : rollNo;
};

export const parseRollNumber = (rollNo: string, prefix?: string): string => {
  if (!rollNo) return '';

  if (prefix && rollNo.startsWith(prefix)) {
    return rollNo.substring(prefix.length);
  }

  return rollNo;
};

-- Supabase database schema for Certificate Verification System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create institutions table
CREATE TABLE institutions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    authority_wallet VARCHAR(44) UNIQUE NOT NULL,
    type VARCHAR(100) DEFAULT 'University',
    website VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    description TEXT,
    established_year INTEGER,
    accreditation VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(44),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create certificates table
CREATE TABLE certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    roll_no VARCHAR(100) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    certificate_id VARCHAR(100) UNIQUE NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    issued_by VARCHAR(44) NOT NULL, -- Wallet address of the issuer
    student_wallet VARCHAR(44) NOT NULL, -- Wallet address of the student
    issued_date DATE NOT NULL,
    certificate_hash VARCHAR(128) UNIQUE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,

    verification_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create certificate_verifications table for tracking verifications
CREATE TABLE certificate_verifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE,
    verifier_wallet VARCHAR(44),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create global_state table for system statistics
CREATE TABLE global_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    authority_wallet VARCHAR(44) UNIQUE NOT NULL,
    total_institutions INTEGER DEFAULT 0,
    total_certificates INTEGER DEFAULT 0,
    total_verifications INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Create indexes for better performance
CREATE INDEX idx_certificates_student_name ON certificates(student_name);
CREATE INDEX idx_certificates_roll_no ON certificates(roll_no);
CREATE INDEX idx_certificates_certificate_id ON certificates(certificate_id);
CREATE INDEX idx_certificates_institution_name ON certificates(institution_name);
CREATE INDEX idx_certificates_issued_by ON certificates(issued_by);
CREATE INDEX idx_certificates_student_wallet ON certificates(student_wallet);
CREATE INDEX idx_certificates_is_revoked ON certificates(is_revoked);

CREATE INDEX idx_institutions_authority_wallet ON institutions(authority_wallet);
CREATE INDEX idx_institutions_is_verified ON institutions(is_verified);
CREATE INDEX idx_certificate_verifications_certificate_id ON certificate_verifications(certificate_id);

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_state_updated_at
    BEFORE UPDATE ON global_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment verification count
CREATE OR REPLACE FUNCTION increment_verification_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE certificates
    SET verification_count = verification_count + 1
    WHERE id = NEW.certificate_id;

    UPDATE global_state
    SET total_verifications = total_verifications + 1
    WHERE id = 1;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_verification_count_trigger
    AFTER INSERT ON certificate_verifications
    FOR EACH ROW EXECUTE FUNCTION increment_verification_count();

-- Function to update global statistics when certificates are created
CREATE OR REPLACE FUNCTION update_certificate_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE global_state
        SET total_certificates = total_certificates + 1
        WHERE id = 1;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_certificate_stats_trigger
    AFTER INSERT ON certificates
    FOR EACH ROW EXECUTE FUNCTION update_certificate_stats();

-- Function to update global statistics when institutions are created
CREATE OR REPLACE FUNCTION update_institution_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE global_state
        SET total_institutions = total_institutions + 1
        WHERE id = 1;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_institution_stats_trigger
    AFTER INSERT ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_institution_stats();

-- Row Level Security (RLS) policies
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_state ENABLE ROW LEVEL SECURITY;

-- Policies for institutions table
CREATE POLICY "Institutions are viewable by everyone" ON institutions
    FOR SELECT USING (true);

CREATE POLICY "Institutions can be inserted by authenticated users" ON institutions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Institutions can be updated by their authority" ON institutions
    FOR UPDATE USING (authority_wallet = auth.jwt() ->> 'wallet_address');

-- Policies for certificates table
CREATE POLICY "Certificates are viewable by everyone" ON certificates
    FOR SELECT USING (true);

CREATE POLICY "Certificates can be inserted by authenticated users" ON certificates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Certificates can be updated by their issuer" ON certificates
    FOR UPDATE USING (issued_by = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Students can view their own certificates" ON certificates
    FOR SELECT USING (student_wallet = auth.jwt() ->> 'wallet_address');

-- Policies for certificate_verifications table
CREATE POLICY "Verifications are viewable by everyone" ON certificate_verifications
    FOR SELECT USING (true);

CREATE POLICY "Verifications can be inserted by everyone" ON certificate_verifications
    FOR INSERT WITH CHECK (true);

-- Policies for global_state table
CREATE POLICY "Global state is viewable by everyone" ON global_state
    FOR SELECT USING (true);

CREATE POLICY "Global state can be updated by system authority" ON global_state
    FOR UPDATE USING (authority_wallet = auth.jwt() ->> 'wallet_address');

-- Insert initial global state record
INSERT INTO global_state (authority_wallet, total_institutions, total_certificates, total_verifications)
VALUES ('SYSTEM_AUTHORITY_PLACEHOLDER', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Sample data (optional - remove in production)
-- INSERT INTO institutions (name, location, authority_wallet, is_verified) VALUES
-- ('Tech University', 'San Francisco, CA', 'SAMPLE_WALLET_ADDRESS_1', true),
-- ('State College', 'Austin, TX', 'SAMPLE_WALLET_ADDRESS_2', false);

-- INSERT INTO certificates (
--     student_name, roll_no, course_name, grade, certificate_id,
--     institution_name, issued_by, issued_date, certificate_hash
-- ) VALUES (
--     'John Doe', '2023001', 'Computer Science Degree', 'A+', 'CERT-2024-001',
--     'Tech University', 'SAMPLE_WALLET_ADDRESS_1', '2024-01-15',
--     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
-- );

-- Create functions for API endpoints
CREATE OR REPLACE FUNCTION get_certificate_by_id(cert_id UUID)
RETURNS TABLE(
    id UUID,
    student_name VARCHAR,
    roll_no VARCHAR,
    course_name VARCHAR,
    grade VARCHAR,
    certificate_id VARCHAR,
    institution_name VARCHAR,
    issued_by VARCHAR,
    student_wallet VARCHAR,
    issued_date DATE,
    certificate_hash VARCHAR,
    is_revoked BOOLEAN,
    verification_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.student_name, c.roll_no, c.course_name, c.grade,
           c.certificate_id, c.institution_name, c.issued_by, c.student_wallet, c.issued_date,
           c.certificate_hash, c.is_revoked, c.verification_count, c.created_at
    FROM certificates c
    WHERE c.id = cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_certificate(cert_id UUID, verifier_wallet VARCHAR DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    cert_exists BOOLEAN;
    cert_revoked BOOLEAN;
BEGIN
    -- Check if certificate exists and is not revoked
    SELECT EXISTS(SELECT 1 FROM certificates WHERE id = cert_id),
           COALESCE((SELECT is_revoked FROM certificates WHERE id = cert_id), true)
    INTO cert_exists, cert_revoked;

    IF NOT cert_exists THEN
        RETURN FALSE;
    END IF;

    IF cert_revoked THEN
        RETURN FALSE;
    END IF;

    -- Log the verification
    INSERT INTO certificate_verifications (certificate_id, verifier_wallet)
    VALUES (cert_id, verifier_wallet);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample certificate data for testing verification system
-- Run this script to insert test certificates into the database

-- Insert sample certificates for testing
INSERT INTO public.certificates (
    student_name,
    roll_no,
    course_name,
    grade,
    certificate_id,
    institution_name,
    issued_by,
    issued_date,
    certificate_hash,
    is_revoked,
    student_wallet,
    nft_mint,
    verification_count
) VALUES
-- Valid certificate 1
(
    'John Doe',
    '2021CS001',
    'Computer Science and Engineering',
    'A+',
    'CERT-2024-001',
    'MIT Institute of Technology',
    'BYQ7mNMX1UWjaC4yZ9KQFRsNSTyTf84FrkpgcpKorcky',
    '2024-01-15',
    'a1b2c3d4e5f6789012345678901234567890abcdef123456789',
    false,
    'EStudentWallet123456789012345678901234',
    'ENftMint123456789012345678901234567890',
    3
),

-- Valid certificate 2
(
    'Jane Smith',
    '2021ME045',
    'Mechanical Engineering',
    'A',
    'CERT-2024-002',
    'Stanford University',
    'CTestWallet234567890123456789012345678',
    '2024-02-20',
    'b2c3d4e5f6789012345678901234567890abcdef1234567890',
    false,
    'FStudentWallet234567890123456789012345',
    null,
    1
),

-- Valid certificate 3
(
    'Alice Johnson',
    '2022EE078',
    'Electrical Engineering',
    'B+',
    'CERT-2024-003',
    'Harvard University',
    'DTestWallet345678901234567890123456789',
    '2024-03-10',
    'c3d4e5f6789012345678901234567890abcdef12345678901',
    false,
    null,
    null,
    0
),

-- Revoked certificate
(
    'Bob Wilson',
    '2021CS099',
    'Computer Science',
    'B',
    'CERT-2024-004',
    'MIT Institute of Technology',
    'BYQ7mNMX1UWjaC4yZ9KQFRsNSTyTf84FrkpgcpKorcky',
    '2024-01-25',
    'd4e5f6789012345678901234567890abcdef123456789012',
    true,
    'GStudentWallet345678901234567890123456',
    'HNftMint234567890123456789012345678901',
    5
),

-- Valid certificate 4 - Different institution
(
    'Carol Brown',
    '2023BA012',
    'Business Administration',
    'A-',
    'CERT-2024-005',
    'Oxford Business School',
    'ETestWallet456789012345678901234567890',
    '2024-04-05',
    'e5f6789012345678901234567890abcdef1234567890123',
    false,
    'IStudentWallet456789012345678901234567',
    null,
    2
),

-- Valid certificate 5 - Medical
(
    'David Lee',
    '2020MD001',
    'Doctor of Medicine',
    'Pass',
    'CERT-2024-006',
    'Johns Hopkins Medical School',
    'FTestWallet567890123456789012345678901',
    '2024-05-12',
    'f6789012345678901234567890abcdef12345678901234',
    false,
    'JStudentWallet567890123456789012345678',
    'KNftMint345678901234567890123456789012',
    1
),

-- Valid certificate 6 - Arts
(
    'Emma Davis',
    '2022FA033',
    'Fine Arts',
    'A',
    'CERT-2024-007',
    'Royal College of Art',
    'GTestWallet678901234567890123456789012',
    '2024-06-18',
    '6789012345678901234567890abcdef123456789012345',
    false,
    null,
    null,
    0
),

-- Valid certificate 7 - Law
(
    'Frank Miller',
    '2021LAW055',
    'Juris Doctor',
    'B+',
    'CERT-2024-008',
    'Yale Law School',
    'HTestWallet789012345678901234567890123',
    '2024-07-22',
    '789012345678901234567890abcdef1234567890123456',
    false,
    'LStudentWallet678901234567890123456789',
    null,
    4
),

-- Valid certificate 8 - Engineering
(
    'Grace Wang',
    '2023CE044',
    'Civil Engineering',
    'A+',
    'CERT-2024-009',
    'California Institute of Technology',
    'ITestWallet890123456789012345678901234',
    '2024-08-30',
    '89012345678901234567890abcdef12345678901234567',
    false,
    'MStudentWallet789012345678901234567890',
    'NNftMint456789012345678901234567890123',
    2
),

-- Valid certificate 9 - Psychology
(
    'Henry Taylor',
    '2022PSY067',
    'Psychology',
    'A-',
    'CERT-2024-010',
    'University of Cambridge',
    'JTestWallet901234567890123456789012345',
    '2024-09-14',
    '9012345678901234567890abcdef123456789012345678',
    false,
    null,
    null,
    1
);

-- Update the sequences and triggers
SELECT setval(pg_get_serial_sequence('certificates', 'id'), (SELECT MAX(id) FROM certificates));

-- Display inserted certificates for verification
SELECT
    certificate_id,
    student_name,
    institution_name,
    course_name,
    grade,
    is_revoked,
    verification_count
FROM certificates
ORDER BY certificate_id;

-- Show summary statistics
SELECT
    COUNT(*) as total_certificates,
    COUNT(CASE WHEN is_revoked = false THEN 1 END) as valid_certificates,
    COUNT(CASE WHEN is_revoked = true THEN 1 END) as revoked_certificates,
    SUM(verification_count) as total_verifications
FROM certificates;

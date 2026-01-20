-- Add reg_no column to students table
-- This column will store the unique registration string (e.g., 6-2-1055...)
-- It is nullable because Admin-added students might not have it initially.

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS reg_no TEXT;

-- Consider adding a unique constraint if reg_no should be unique when present
-- ALTER TABLE students ADD CONSTRAINT students_reg_no_key UNIQUE (reg_no);

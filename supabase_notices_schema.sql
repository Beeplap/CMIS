-- Notices Module Schema
-- Supports Admin, Teacher, and Student dashboards with role-based access

-- 1. Create notices table
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT NULL,
  
  -- Targeting
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'students', 'teachers', 'semester', 'course', 'batch')),
  target_value TEXT NULL, -- For semester: "5", for course: course_id, for batch: batch_id
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX notices_target_type_idx ON public.notices(target_type);
CREATE INDEX notices_target_value_idx ON public.notices(target_value) WHERE target_value IS NOT NULL;
CREATE INDEX notices_created_by_idx ON public.notices(created_by);
CREATE INDEX notices_is_pinned_idx ON public.notices(is_pinned);
CREATE INDEX notices_expires_at_idx ON public.notices(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX notices_created_at_idx ON public.notices(created_at DESC);

-- 2. Create notice_reads table (track who read what)
CREATE TABLE IF NOT EXISTS public.notice_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate reads
  UNIQUE(notice_id, user_id)
);

-- Indexes for notice_reads
CREATE INDEX notice_reads_notice_id_idx ON public.notice_reads(notice_id);
CREATE INDEX notice_reads_user_id_idx ON public.notice_reads(user_id);
CREATE INDEX notice_reads_read_at_idx ON public.notice_reads(read_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_reads ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for notices

-- Policy: Everyone can read notices (filtering happens in application logic)
CREATE POLICY "Anyone can view notices"
  ON public.notices
  FOR SELECT
  USING (true);

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all notices"
  ON public.notices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Teachers can create notices
CREATE POLICY "Teachers can create notices"
  ON public.notices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

-- Policy: Teachers can update/delete their own notices
CREATE POLICY "Teachers can manage own notices"
  ON public.notices
  FOR ALL
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

-- 5. RLS Policies for notice_reads

-- Policy: Users can read their own read records
CREATE POLICY "Users can view own reads"
  ON public.notice_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can mark notices as read
CREATE POLICY "Users can mark notices as read"
  ON public.notice_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Admins can view all read records
CREATE POLICY "Admins can view all reads"
  ON public.notice_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 6. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION update_notices_updated_at();

-- 7. Helper function to check if notice is relevant to a user
-- This will be used in application logic, not as a database function
-- But we can create a view for easier querying

COMMENT ON TABLE public.notices IS 'Notices/announcements for Admin, Teacher, and Student dashboards';
COMMENT ON TABLE public.notice_reads IS 'Tracks which users have read which notices';
COMMENT ON COLUMN public.notices.target_type IS 'all, students, teachers, semester, course, or batch';
COMMENT ON COLUMN public.notices.target_value IS 'Semester number, course_id, or batch_id depending on target_type';

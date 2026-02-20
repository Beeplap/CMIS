-- Assignments table for teacher ↔ student workflow

-- make sure pgcrypto is enabled
-- create extension if not exists "pgcrypto";

create table public.assignments (
  id uuid primary key default gen_random_uuid(),

  -- who created the assignment
  teacher_id uuid not null
    references public.users (id) on delete cascade,

  -- link to teaching_assignments entry (subject + batch)
  teaching_assignment_id uuid not null
    references public.teaching_assignments (id) on delete cascade,

  title text not null,
  description text null,

  due_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_teacher_id_idx
  on public.assignments (teacher_id);

create index assignments_teaching_assignment_id_idx
  on public.assignments (teaching_assignment_id);


-- Submissions table (one per student per assignment)
create table public.submissions (
  id uuid primary key default gen_random_uuid(),

  assignment_id uuid not null
    references public.assignments (id) on delete cascade,

  student_id uuid not null
    references public.students (id) on delete cascade,

  content text null,          -- text answer or link
  file_url text null,         -- optional file upload URL

  status text not null default 'submitted'
    check (status in ('submitted', 'graded')),

  grade numeric null,
  feedback text null,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint submissions_assignment_student_key
    unique (assignment_id, student_id)
);

create index submissions_student_id_idx
  on public.submissions (student_id);

create index submissions_assignment_id_idx
  on public.submissions (assignment_id);


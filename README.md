# ScholarSync

**College Management and Information System** – A modern, full-featured platform for managing academic administration, students, teachers, attendance, assignments, notices, and more.

## Overview

ScholarSync is a comprehensive college management system designed to streamline administration, enhance communication, and provide role-based dashboards for admins, teachers, and students. Built with Next.js, React, Supabase, and Tailwind CSS.

## Project Structure

```
scholarSync/
├── frontend/          # Next.js application (client + API routes)
│   ├── app/           # App router pages & layouts
│   ├── components/    # React components
│   │   ├── dashboard/ # Feature-specific components
│   │   └── ui/        # Reusable UI primitives
│   ├── lib/           # Utilities, Supabase client
│   └── app/api/       # API routes
├── backend/           # Optional server-side services
└── supabase_*.sql     # Database schemas
```

## Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For admin/teacher APIs that need elevated access:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Radix UI, Headless UI, Lucide Icons
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Features

### Role-Based Dashboards

- **Admin**: User management (students, teachers), curriculum, batches, attendance overview, notices, fees, reports
- **Teacher**: Classes, attendance marking, assignments, grading, notices, marks
- **Student**: Assignments, notices, attendance view, marks, profile

### Core Modules

- **User Management** – Add, edit, delete students and teachers
- **Curriculum & Batches** – Courses, subjects, semesters, batch creation
- **Teaching Assignments** – Assign teachers to subjects and batches
- **Attendance** – Daily/quick marking, history, statistics
- **Assignments & Submissions** – Create assignments, submit, grade
- **Notices & Announcements** – Create, pin, target by role/semester/course/batch
- **Notifications** – In-app notifications for teachers and admins
- **Marks & Evaluation** – Record and view student performance
- **Reports** – Attendance stats, batch breakdown, export

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Contributing

1. Make changes in the appropriate directories
2. Test locally
3. Update documentation as needed
4. Submit a pull request

## License

This project is private and proprietary.

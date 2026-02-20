import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET: Fetch notices based on user role and context
export async function GET(req) {
  const supabase = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const role = searchParams.get("role");
    const studentId = searchParams.get("student_id"); // For students to get their batch/semester

    if (!userId || !role) {
      return NextResponse.json(
        { error: "user_id and role are required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("notices")
      .select(`
        *,
        created_by_user:users!notices_created_by_fkey(id, full_name, email)
      `)
      .or("expires_at.is.null,expires_at.gte.now()"); // Only non-expired notices

    // Role-based filtering
    if (role === "student") {
      // Students see: all, students, their semester, their courses/batches
      const { data: studentData } = await supabase
        .from("students")
        .select("batch_id, batch:batches(academic_unit, course_id)")
        .eq("id", userId)
        .single();

      const studentSemester = studentData?.batch?.academic_unit;
      const studentBatchId = studentData?.batch_id;
      const studentCourseId = studentData?.batch?.course_id;

      // Build OR conditions for student visibility
      const conditions = [
        "target_type.eq.all",
        "target_type.eq.students",
      ];

      if (studentSemester) {
        conditions.push(`and(target_type.eq.semester,target_value.eq.${studentSemester})`);
      }
      if (studentBatchId) {
        conditions.push(`and(target_type.eq.batch,target_value.eq.${studentBatchId})`);
      }
      if (studentCourseId) {
        conditions.push(`and(target_type.eq.course,target_value.eq.${studentCourseId})`);
      }

      query = query.or(conditions.join(","));
    } else if (role === "teacher") {
      // Teachers see: all, teachers, and notices they created
      query = query.or(`target_type.eq.all,target_type.eq.teachers,created_by.eq.${userId}`);
    } else if (role === "admin") {
      // Admins see everything (no filter needed)
    }

    // Order: pinned first, then by created_at DESC
    query = query.order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Check read status for current user
    if (data && data.length > 0) {
      const noticeIds = data.map(n => n.id);
      const { data: reads } = await supabase
        .from("notice_reads")
        .select("notice_id")
        .eq("user_id", userId)
        .in("notice_id", noticeIds);

      const readNoticeIds = new Set(reads?.map(r => r.notice_id) || []);

      // Add is_read flag to each notice
      data.forEach(notice => {
        notice.is_read = readNoticeIds.has(notice.id);
      });
    }

    return NextResponse.json({ notices: data || [] });
  } catch (error) {
    console.error("Error fetching notices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notices" },
      { status: 500 }
    );
  }
}

// POST: Create a new notice
export async function POST(req) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json();
    const {
      title,
      message,
      attachment_url,
      target_type,
      target_value,
      is_pinned,
      expires_at,
      created_by,
    } = body;

    // Validation
    if (!title || !message || !target_type || !created_by) {
      return NextResponse.json(
        { error: "title, message, target_type, and created_by are required" },
        { status: 400 }
      );
    }

    // Validate target_type
    const validTargetTypes = ["all", "students", "teachers", "semester", "course", "batch"];
    if (!validTargetTypes.includes(target_type)) {
      return NextResponse.json(
        { error: `Invalid target_type. Must be one of: ${validTargetTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if user has permission to create notice
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", created_by)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Teachers can only create notices for their assigned courses/batches
    if (user.role === "teacher") {
      if (target_type === "course" || target_type === "batch") {
        // Verify teacher is assigned to this course/batch
        const { data: assignments } = await supabase
          .from("teaching_assignments")
          .select("batch_id, batch:batches(course_id)")
          .eq("teacher_id", created_by);

        const assignedBatchIds = assignments?.map(a => a.batch_id) || [];
        const assignedCourseIds = assignments?.map(a => a.batch?.course_id).filter(Boolean) || [];

        if (target_type === "batch" && !assignedBatchIds.includes(target_value)) {
          return NextResponse.json(
            { error: "You can only create notices for your assigned batches" },
            { status: 403 }
          );
        }
        if (target_type === "course" && !assignedCourseIds.includes(target_value)) {
          return NextResponse.json(
            { error: "You can only create notices for your assigned courses" },
            { status: 403 }
          );
        }
      }
    }

    // Insert notice
    const { data, error } = await supabase
      .from("notices")
      .insert({
        title,
        message,
        attachment_url: attachment_url || null,
        target_type,
        target_value: target_value || null,
        is_pinned: is_pinned || false,
        expires_at: expires_at || null,
        created_by,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notice: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating notice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create notice" },
      { status: 500 }
  );
  }
}

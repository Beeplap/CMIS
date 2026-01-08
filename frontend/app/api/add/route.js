import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      full_name,
      role,
      // Student specific
      gender,
      class: studentClass,
      section,
      phone_number,
      guardian_name,
      guardian_phone,
      guardian_contact,
      address,
      date_of_birth,
      admission_date,
    } = body;

    // 1. Validation
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, full_name, role)" },
        { status: 400 }
      );
    }

    if (role === "student") {
      if (!gender || !studentClass || !phone_number) {
        return NextResponse.json(
          { error: "Student requires gender, class, and phone number." },
          { status: 400 }
        );
      }
    }

    // 2. Setup Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfigured: Missing Supabase keys." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 4. Insert into public.users
    // We execute this immediately to ensure the user exists in our tracking table.
    const { error: userTableError } = await supabase.from("users").insert({
      id: userId,
      email,
      role,
      full_name,
      is_active: true,
    });

    if (userTableError) {
      console.error("Users table insert error:", userTableError);
      // Optional: Delete the auth user to rollback
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile: " + userTableError.message },
        { status: 500 }
      );
    }

    // 5. Insert into Role-Specific Table (students / teachers)
    if (role === "teacher") {
      // Generate Teacher ID
      // Simple generator: TCH-{Random4Digits} to avoid race conditions with MAX()
      const teacherId = `TCH-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { error: teacherError } = await supabase.from("teachers").insert({
        id: userId,
        full_name,
        email,
        teacher_id: teacherId, // Or generate sequentially if strict
      });

      if (teacherError) {
        console.error("Teachers table insert error:", teacherError);
        // Note: User exists in 'users' and 'auth', but not 'teachers'. 
        // Admin might need to fix manually or we can fail harder.
        // For now, returning warning.
        return NextResponse.json(
          { message: "User created, but failed to add to teachers table.", details: teacherError.message },
          { status: 207 } // Multi-status / Partial success
        );
      }
    } else if (role === "student") {
      // Generate Roll Number
      // Logic: ClassPrefix + Year + Random/Sequence
      // Simplify: Uppercase alphanumeric class + Random 4 digits to minimize collision logic complexity
      const classCode = (studentClass || "STD").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4);
      const rollNumber = `${classCode}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error: studentError } = await supabase.from("students").insert({
        id: userId,
        roll: rollNumber,
        full_name,
        class: studentClass,
        section: section || null,
        gender,
        phone_number,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        guardian_contact: guardian_contact || null,
        address: address || null,
        dob: date_of_birth || null, 
        admission_date: admission_date || new Date().toISOString().split('T')[0]
      });

      if (studentError) {
         console.error("Students table insert error:", studentError);
         return NextResponse.json(
          { message: "User created, but failed to add to students table.", details: studentError.message },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ message: "User created successfully" }, { status: 200 });

  } catch (err) {
    console.error("Unexpected error in /api/add:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

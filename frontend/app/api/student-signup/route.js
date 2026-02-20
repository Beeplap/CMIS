import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, registrationNumber, dob } =
      body;

    // 1. Basic Validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !registrationNumber ||
      !dob
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // 2. Setup Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfigured: Missing Supabase keys." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Check Invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("registration_number", registrationNumber)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        {
          error: "Invalid registration number. Please contact administration.",
        },
        { status: 404 },
      );
    }

    if (invitation.is_claimed) {
      return NextResponse.json(
        { error: "This registration number has already been registered." },
        { status: 409 },
      );
    }

    // 4. Verify Name and DOB
    // normalize strings for comparison
    const dbName = invitation.full_name.toLowerCase().trim();
    const inputName = fullName.toLowerCase().trim();

    // Simple check: input name should match db name (fuzzy or strict?)
    // Strict for now as per prompt "if first name and registration number matches"
    // actually user said "first name", but sticking to full name is safer for "Aakash xxx" vs "Aakash yyy"
    if (dbName !== inputName) {
      // Fallback: check if DB name *starts with* first name (if db is "Aakash Chaudhary" and input is "Aakash")
      // validation: "if first name ... matches"
      const dbFirstName = dbName.split(" ")[0];
      const inputFirstName = firstName.toLowerCase().trim();

      if (dbFirstName !== inputFirstName) {
        return NextResponse.json(
          { error: "Student name does not match our records." },
          { status: 400 },
        );
      }
    }

    // Check DOB - Validation Removed as per user request (Step 95)
    // We trust the student's input DOB and will save it to their profile instead of matching it.

    // 5. Create Auth User
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: "student" },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 6. Insert into Users Table
    const { error: userTableError } = await supabase.from("users").insert({
      id: userId,
      email,
      role: "student",
      full_name: fullName,
      is_active: true,
    });

    if (userTableError) {
      // rollback auth
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile." },
        { status: 500 },
      );
    }

    // 7. Insert into Students Table
    const { error: studentError } = await supabase.from("students").insert({
      id: userId,
      reg_no: registrationNumber, // Store the official Registration Number here
      roll: null, // Roll number will be assigned when added to a batch
      full_name: fullName,
      dob: dob,
    });

    if (studentError) {
      console.error("Student insert error", studentError);

      // Rollback: Delete from public.users and auth.users
      await supabase.from("users").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error:
            "Failed to link student details. Account creation rolled back.",
          details: studentError.message,
        },
        { status: 500 },
      );
    }

    // 8. Assign new student to default 5th semester batch (if available)
    try {
      const { data: defaultBatch, error: batchError } = await supabase
        .from("batches")
        .select("id, academic_unit, admission_year")
        .eq("academic_unit", 5)
        .eq("is_active", true)
        .order("admission_year", { ascending: false })
        .limit(1)
        .single();

      if (batchError) {
        console.error("Failed to fetch default 5th sem batch:", batchError);
      } else if (defaultBatch) {
        // Link student to this batch
        const { error: updateStudentError } = await supabase
          .from("students")
          .update({ batch_id: defaultBatch.id })
          .eq("id", userId);

        if (updateStudentError) {
          console.error(
            "Failed to assign new student to default 5th sem batch:",
            updateStudentError,
          );
        } else {
          // Recalculate rolls for that batch, best-effort (don't fail signup)
          try {
            const { recalculateBatchRolls } = await import(
              "@/lib/rollGenerator"
            );
            await recalculateBatchRolls(supabase, defaultBatch.id);
          } catch (rollError) {
            console.error(
              "Failed to recalculate rolls for default 5th sem batch:",
              rollError,
            );
          }
        }
      }
    } catch (assignErr) {
      console.error(
        "Unexpected error while assigning default 5th sem batch:",
        assignErr,
      );
    }

    // 9. Mark Invitation as Claimed
    await supabase
      .from("student_invitations")
      .update({ is_claimed: true })
      .eq("id", invitation.id);

    return NextResponse.json(
      { message: "Registration successful! You can now login." },
      { status: 200 },
    );
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

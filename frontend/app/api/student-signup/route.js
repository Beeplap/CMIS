import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, registrationNumber, dob } =
      body;

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

    // Email validation - reject invalid formats (123@123.com, etc.)
    const trimmedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (
      trimmedEmail.length < 6 ||
      trimmedEmail.length > 254 ||
      !emailRegex.test(trimmedEmail)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    const [localPart, domainPart] = trimmedEmail.split("@");
    if (!/[a-zA-Z]/.test(localPart)) {
      return NextResponse.json(
        { error: "Invalid email format. The email address is not valid." },
        { status: 400 },
      );
    }
    const domainSegments = domainPart.split(".");
    const domainName = domainSegments.slice(0, -1).join(".");
    const tld = domainSegments[domainSegments.length - 1];
    if (
      !domainName ||
      !/[a-zA-Z]/.test(domainName) ||
      !tld ||
      !/^[a-zA-Z]{2,6}$/.test(tld)
    ) {
      return NextResponse.json(
        { error: "Invalid email format. Please use a real email address." },
        { status: 400 },
      );
    }

    // Password validation: min 8 chars, 1 uppercase, 1 special character
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter." },
        { status: 400 },
      );
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one special character (!@#$%^&* etc.)." },
        { status: 400 },
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // Setup Admin Client
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

   
    const dbName = invitation.full_name.toLowerCase().trim();
    const inputName = fullName.toLowerCase().trim();

   
    if (dbName !== inputName) {
     
      const dbFirstName = dbName.split(" ")[0];
      const inputFirstName = firstName.toLowerCase().trim();

      if (dbFirstName !== inputFirstName) {
        return NextResponse.json(
          { error: "Student name does not match our records." },
          { status: 400 },
        );
      }
    }

 
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: trimmedEmail,
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
      email: trimmedEmail,
      role: "student",
      full_name: fullName,
      is_active: true,
    });

    if (userTableError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile." },
        { status: 500 },
      );
    }

    const { error: studentError } = await supabase.from("students").insert({
      id: userId,
      reg_no: registrationNumber, 
      roll: null, 
      full_name: fullName,
      dob: dob,
    });

    if (studentError) {
      console.error("Student insert error", studentError);

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

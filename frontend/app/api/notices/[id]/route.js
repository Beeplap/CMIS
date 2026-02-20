import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET: Get a single notice with read status
export async function GET(req, { params }) {
  const supabase = getSupabaseAdmin();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    const { data, error } = await supabase
      .from("notices")
      .select(`
        *,
        created_by_user:users!notices_created_by_fkey(id, full_name, email),
        reads:notice_reads(
          id,
          user_id,
          read_at,
          user:users(id, full_name, email, role)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    // Check if current user has read it
    if (userId) {
      const { data: read } = await supabase
        .from("notice_reads")
        .select("read_at")
        .eq("notice_id", id)
        .eq("user_id", userId)
        .single();

      data.is_read = !!read;
      data.read_at = read?.read_at || null;
    }

    return NextResponse.json({ notice: data });
  } catch (error) {
    console.error("Error fetching notice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notice" },
      { status: 500 }
    );
  }
}

// PUT: Update a notice
export async function PUT(req, { params }) {
  const supabase = getSupabaseAdmin();
  try {
    const { id } = params;
    const body = await req.json();
    const {
      title,
      message,
      attachment_url,
      target_type,
      target_value,
      is_pinned,
      expires_at,
      user_id, // To verify permissions
    } = body;

    // Get current notice
    const { data: notice } = await supabase
      .from("notices")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    // Check permissions
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", user_id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admin or creator can update
    if (user.role !== "admin" && notice.created_by !== user_id) {
      return NextResponse.json(
        { error: "You don't have permission to update this notice" },
        { status: 403 }
      );
    }

    // Build update object
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (message !== undefined) updates.message = message;
    if (attachment_url !== undefined) updates.attachment_url = attachment_url;
    if (target_type !== undefined) updates.target_type = target_type;
    if (target_value !== undefined) updates.target_value = target_value;
    if (is_pinned !== undefined) updates.is_pinned = is_pinned;
    if (expires_at !== undefined) updates.expires_at = expires_at;

    const { data, error } = await supabase
      .from("notices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notice: data });
  } catch (error) {
    console.error("Error updating notice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notice" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a notice
export async function DELETE(req, { params }) {
  const supabase = getSupabaseAdmin();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Get current notice
    const { data: notice } = await supabase
      .from("notices")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    // Check permissions
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", user_id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admin or creator can delete
    if (user.role !== "admin" && notice.created_by !== user_id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this notice" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete notice" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// POST: Mark a notice as read
export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  try {
    const { id: noticeId } = params;
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Upsert read record (idempotent - safe to call multiple times)
    const { data, error } = await supabase
      .from("notice_reads")
      .upsert(
        {
          notice_id: noticeId,
          user_id: user_id,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "notice_id,user_id",
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ read: data });
  } catch (error) {
    console.error("Error marking notice as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark notice as read" },
      { status: 500 }
    );
  }
}

// DELETE: Unmark a notice as read (optional feature)
export async function DELETE(req, { params }) {
  const supabase = getSupabaseAdmin();
  try {
    const { id: noticeId } = params;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("notice_reads")
      .delete()
      .eq("notice_id", noticeId)
      .eq("user_id", user_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unmarking notice as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unmark notice as read" },
      { status: 500 }
    );
  }
}

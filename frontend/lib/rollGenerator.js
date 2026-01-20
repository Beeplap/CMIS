export async function recalculateBatchRolls(supabase, batchId) {
  if (!batchId) return;

  try {
    // 1. Fetch all students in the batch
    const { data: students, error } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("batch_id", batchId)
      .order("full_name", { ascending: true }); // Alphabetical order

    if (error) {
      console.error("Error fetching batch students for roll calc:", error);
      return;
    }

    if (!students || students.length === 0) return;

    // 2. Update roll numbers sequentially
    // usage: "1", "2", "3" ...
    // using Promise.all for parallel updates, though sequential might be safer for DB load if huge.
    // batch size is usually small (<100), so Promise.all is fine.

    const updates = students.map((student, index) => {
      const newRoll = (index + 1).toString();
      return supabase
        .from("students")
        .update({ roll: newRoll })
        .eq("id", student.id);
    });

    await Promise.all(updates);
    console.log(
      `Recalculated rolls for batch ${batchId}: ${updates.length} students updated.`,
    );
  } catch (err) {
    console.error("Unexpected error in recalculateBatchRolls:", err);
  }
}

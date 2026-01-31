export async function recalculateBatchRolls(supabase, batchId) {
  if (!batchId) {
    console.warn("recalculateBatchRolls called with null batchId");
    return;
  }

  console.log(`Starting roll recalculation for batch: ${batchId}`);

  try {
    // 1. Fetch all students in the batch
    const { data: students, error } = await supabase
      .from("students")
      .select("id, full_name, roll")
      .eq("batch_id", batchId)
      .order("full_name", { ascending: true }); // Alphabetical order

    if (error) {
      console.error("Error fetching batch students for roll calc:", error);
      return;
    }

    if (!students || students.length === 0) {
      console.log(`No students found in batch ${batchId}`);
      return;
    }

    console.log(
      `Found ${students.length} students in batch. Assigning rolls...`,
    );
    students.forEach((s, i) =>
      console.log(`${i + 1}. ${s.full_name} (${s.id})`),
    );

    // 2. Update roll numbers sequentially
    // usage: "1", "2", "3" ...
    const updates = students.map((student, index) => {
      const newRoll = (index + 1).toString();

      // Optimization: Skip if already correct
      if (student.roll === newRoll) return Promise.resolve();

      return supabase
        .from("students")
        .update({ roll: newRoll })
        .eq("id", student.id)
        .then(({ error }) => {
          if (error)
            console.error(
              `Failed to update roll for ${student.full_name}:`,
              error,
            );
          else console.log(`Updated ${student.full_name} -> Roll ${newRoll}`);
        });
    });

    await Promise.all(updates);
    console.log(`Recalculated rolls for batch ${batchId}: Process completed.`);
  } catch (err) {
    console.error("Unexpected error in recalculateBatchRolls:", err);
  }
}

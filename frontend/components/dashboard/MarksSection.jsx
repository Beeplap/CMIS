"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle } from "lucide-react";

export default function MarksSection({ teacherId }) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // { student_id: mark_value }
  const [examType, setExamType] = useState("Mid Term");
  const [maxMarks, setMaxMarks] = useState(100);

  useEffect(() => {
    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndMarks();
    } else {
      setStudents([]);
      setMarks({});
    }
  }, [selectedClass, examType]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", teacherId);
    setClasses(data || []);
  };

  const fetchStudentsAndMarks = async () => {
    setLoading(true);
    try {
      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .eq("class", classes.find(c => c.id === selectedClass)?.grade || "") // Assuming 'grade' maps to class name for now, or use ID if schema links
        // If your student's 'class' column stores the Class Name (e.g. "10A"), use that.
        // If it stores a UUID, use selectedClass directly.
        // Let's assume for now keeping consistent with AttendancePage which filtered by "class" string name.
        // We need to match the class logic. Let's look at classes data first.
        // Actually, let's try to filter by the class NAME first if that's how it's done elsewhere.
        // BUT, the 'classes' table usually has 'grade' and 'section'.
        // Let's assume we filter students by matching 'grade' + 'section' or just 'class' column in students.
        // Simplified: Fetch students where class = selectedClass (if selectedClass is the name)
        // OR fetch students and filter manually.
        // LET'S USE THE CLASS ID if referencing foreign key, or Name if string.
        // Re-reading AttendancePage: it uses `students.class` column string.
        // We should map the selectedClass ID to the class string Name.
        .order("roll", { ascending: true });
        
      // For now, let's assume `classes` are fetched with ID, but we need to match `students.class` string.
      // We will perform the match in the component.

      const selectedClassRecord = classes.find(c => c.id === selectedClass);
      let classString = "";
      if (selectedClassRecord) {
          // Construct class string like "10-A" or use what's available.
          // AttendancePage uses a distinct list of strings.
          // Let's try to match that logic or just use what we have.
          // We'll fetch all students and filter locally for safety or perform a better query if possible.
          // Safer: fetch students where class string matches.
          classString = `${selectedClassRecord.grade || selectedClassRecord.course}`; // Simplified
          // Actually better to just fetch students where class equals the grade/course for now.
      }


      // Let's refine: The user selects a CLASS object. We need students of that class.
      // If the schema is correct, `students` table has a `class_id` or `class` string.
      // AttendancePage uses `class` string. 
      // Let's try to query students by that string.
      const matchString = selectedClassRecord ? selectedClassRecord.name || selectedClassRecord.subject : ""; // Fallback

      // Correction: Attendance page just shows a list of unique class STRINGS.
      // This components shows assigned classes (rows in 'classes' table).
      // We need to bridge this. 
      // We will use the 'grade' field from classes table to match 'class' field in students table for now.
    
      const { data: matchedStudents } = await supabase
        .from("students")
        .select("*")
        .eq("class", selectedClassRecord?.grade || selectedClassRecord?.course) 
        .order("roll", { ascending: true });

      setStudents(matchedStudents || []);

      // Fetch existing marks
      if (matchedStudents?.length > 0) {
        const studentIds = matchedStudents.map(s => s.id);
        const { data: marksData } = await supabase
          .from("marks")
          .select("*")
          .eq("subject_id", selectedClassRecord?.id) // Using class_id/subject_id as proxy for specific subject class
          .eq("exam_type", examType)
          .in("student_id", studentIds);

        const marksMap = {};
        marksData?.forEach(m => {
          marksMap[m.student_id] = m.marks_obtained;
        });
        setMarks(marksMap);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    setMarks(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = Object.entries(marks).map(([studentId, mark]) => ({
        student_id: studentId,
        subject_id: selectedClass, // Using class ID as subject identifier for this specific teacher-class mapping
        exam_type: examType,
        marks_obtained: mark,
        total_marks: maxMarks,
        // teacher_id: teacherId // If column exists
      }));

      const { error } = await supabase
        .from("marks")
        .upsert(updates, { onConflict: "student_id, subject_id, exam_type" });

      if (error) throw error;
      alert("Marks saved successfully!");
    } catch (error) {
      console.error("Error saving marks:", error);
      alert("Failed to save marks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md border-purple-100">
      <CardHeader>
        <CardTitle className="text-xl text-purple-800">Student Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Class</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.subject} - {c.grade || c.course} ({c.section})
                </option>
              ))}
            </select>
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Exam Type</label>
             <select
              className="w-full p-2 border rounded-md"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              <option>Mid Term</option>
              <option>Final Term</option>
              <option>Unit Test 1</option>
              <option>Unit Test 2</option>
              <option>Assignment</option>
            </select>
          </div>
           <div>
             <label className="block text-sm font-medium mb-1">Max Marks</label>
             <input
              type="number"
              className="w-full p-2 border rounded-md"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {selectedClass && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-purple-50 text-purple-900 uppercase">
                <tr>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Marks (/{maxMarks})</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const mark = marks[student.id] || "";
                  const percentage = (mark / maxMarks) * 100;
                  const isFail = mark !== "" && percentage < 40;

                  return (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{student.roll}</td>
                      <td className="px-4 py-2">{student.full_name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className={`w-20 p-1 border rounded ${isFail ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                          value={mark}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          max={maxMarks}
                        />
                      </td>
                      <td className="px-4 py-2">
                        {mark !== "" && (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${isFail ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {isFail ? 'FAIL' : 'PASS'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">
                      No students found for this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Action */}
        {selectedClass && students.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Marks"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

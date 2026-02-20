"use client";
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle } from "lucide-react";

export default function MarksSection({ teacherId }) {
  const toast = useToast();
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
        // We filter students by matching generic 'class' field to course/semester/section combo
        // For simplicity, we assume students table 'class' column holds values like "BCA Sem-1" or "BBS Year-1"
        // This requires 'students' data to match this format.
        // Let's constructing the identifier from the class object.
        .eq("class", selectedClassRecord ? `${selectedClassRecord.course} ${selectedClassRecord.course === 'BCA' ? 'Sem' : 'Year'}-${selectedClassRecord.semester}` : "")
        .order("roll", { ascending: true });
        
      // ... 

      const classString = selectedClassRecord ? `${selectedClassRecord.course} ${selectedClassRecord.course === 'BCA' ? 'Sem' : 'Year'}-${selectedClassRecord.semester}` : "";

      const { data: matchedStudents } = await supabase
        .from("students")
        .select("*")
        .eq("class", classString) 
        .order("roll", { ascending: true });

      setStudents(matchedStudents || []);

      // Fetch existing marks
      if (matchedStudents?.length > 0) {
        const studentIds = matchedStudents.map(s => s.id);
        const { data: marksData } = await supabase
          .from("marks")
          .select("*")
          .eq("class_id", selectedClassRecord?.id) // Using class_id as identifier
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
        class_id: selectedClass, // Using class ID
        exam_type: examType,
        marks_obtained: mark,
        total_marks: maxMarks,
        // teacher_id: teacherId // If column exists
      }));

      const { error } = await supabase
        .from("marks")
        .upsert(updates, { onConflict: "student_id, class_id, exam_type" });

      if (error) throw error;
      toast.success("Marks saved successfully!");
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error("Failed to save marks.");
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
                    {c.subject} - {c.course} {c.course === 'BCA' ? 'Sem' : 'Year'}-{c.semester} {c.section ? `(${c.section})` : ''}
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

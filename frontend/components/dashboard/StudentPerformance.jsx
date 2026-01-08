"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Activity, AlertTriangle } from "lucide-react";

export default function StudentPerformance({ teacherId }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filterClass, setFilterClass] = useState("All");
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    try {
      // 1. Fetch Teacher's Classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", teacherId);
      
      setClasses(classesData || []);

      // 2. Fetch Students linked to those classes
      // Simplified: Fetch all students that belong to any of the grades/courses the teacher teaches
      const grades = [...new Set(classesData?.map(c => c.grade || c.course).filter(Boolean))];
      
      if (grades.length === 0) {
        setLoading(false);
        return;
      }

      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .in("class", grades);

      if (!studentsData) {
          setStudents([]);
          setLoading(false);
          return;
      }

      // 3. Fetch Aggregated Stats (Attendance & Marks) for these students
      // Note: This can be heavy. Optimally should be database views.
      // We will do a client-side aggregation for now.
      
      const studentIds = studentsData.map(s => s.id);

      // Fetch Attendance Counts
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("student_id, status")
        .in("student_id", studentIds);
      
      // Fetch Marks
      const { data: marksData } = await supabase
        .from("marks")
        .select("student_id, marks_obtained, total_marks")
        .in("student_id", studentIds);

      // Process Data
      const processed = studentsData.map(student => {
        // Attendance
        const stats = attendanceData?.filter(a => a.student_id === student.id) || [];
        const totalDays = stats.length;
        const presentDays = stats.filter(a => a.status === 'present').length;
        const attendancePct = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

        // Marks
        const studentMarks = marksData?.filter(m => m.student_id === student.id) || [];
        let totalObtained = 0;
        let totalPossible = 0;
        studentMarks.forEach(m => {
            totalObtained += (m.marks_obtained || 0);
            totalPossible += (m.total_marks || 100);
        });
        const avgMarks = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) : 0;

        return {
          ...student,
          attendancePct,
          avgMarks,
          risk: parseFloat(attendancePct) < 75 || parseFloat(avgMarks) < 40
        };
      });

      setStudents(processed);

    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = filterClass === "All" 
    ? students 
    : students.filter(s => s.class === filterClass);

  if (loading) return <div>Loading performance data...</div>;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">At Risk Students</p>
              <h3 className="text-2xl font-bold text-red-700">
                {students.filter(s => s.risk).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Performance Report</CardTitle>
          <select 
            className="p-2 border rounded-md text-sm"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="All">All Classes</option>
            {[...new Set(students.map(s => s.class))].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Attendance %</th>
                  <th className="px-4 py-3 text-left">Avg Score %</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{student.full_name}</td>
                    <td className="px-4 py-3">{student.class}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${student.attendancePct < 75 ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${student.attendancePct}%` }}
                          />
                        </div>
                        <span>{student.attendancePct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${student.avgMarks < 40 ? 'text-red-500' : 'text-blue-600'}`}>
                        {student.avgMarks}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                       {student.risk ? (
                         <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">At Risk</span>
                       ) : (
                         <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-bold">Good</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

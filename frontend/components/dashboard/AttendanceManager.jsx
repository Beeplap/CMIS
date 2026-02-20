"use client";
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Save,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

export default function AttendanceManager({ teacherId }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]); // derived from teaching_assignments
  const [selectedClassId, setSelectedClassId] = useState(""); // teaching_assignments.id
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { student_id: 'present' | 'absent' | 'late' }
  const [viewMode, setViewMode] = useState("daily"); // 'daily' | 'quick' | 'history'
  const [historyData, setHistoryData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (teacherId) {
      fetchClasses();
    }
  }, [teacherId]);

  useEffect(() => {
    if (selectedClassId && classes.length > 0) {
      if (viewMode === "history") {
        fetchHistoryData();
      } else {
        // Both Daily and Quick need the same "daily" data
        fetchDailyData();
      }
    } else if (selectedClassId && classes.length === 0) {
      // Reset if class selected but classes not loaded yet
      setStudents([]);
      setAttendance({});
    }
  }, [selectedClassId, selectedDate, viewMode, classes]);

  // Reset quick progress when class/date changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedClassId, selectedDate]);

  // Keep currentIndex in bounds when students list updates
  useEffect(() => {
    setCurrentIndex((i) => {
      if (students.length === 0) return 0;
      return Math.min(i, students.length); // allow i === students.length (completed state)
    });
  }, [students.length]);

  // Load "classes" based on teaching assignments (subject + batch) for this teacher
  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("teaching_assignments")
      .select(
        `
        id,
        batch:batches(id, academic_unit, section, course:courses(code, name)),
        subject:subjects(id, name, code)
      `,
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching teacher classes from teaching_assignments:",
        error,
      );
      setClasses([]);
      return;
    }

    const mapped =
      data?.map((assignment) => ({
        id: assignment.id, // will be used as class_id in attendance
        subjectId: assignment.subject?.id,
        subjectName: assignment.subject?.name || "Unknown Subject",
        subjectCode: assignment.subject?.code,
        batchId: assignment.batch?.id,
        courseCode: assignment.batch?.course?.code || "Unknown Course",
        academicUnit: assignment.batch?.academic_unit || "",
        section: assignment.batch?.section || "",
      })) || [];

    setClasses(mapped);

    // Auto-select the first class for convenience
    if (mapped.length > 0 && !selectedClassId) {
      setSelectedClassId(mapped[0].id);
    }
  };

  const fetchDailyData = async () => {
    if (!selectedClassId) {
      setStudents([]);
      setAttendance({});
      return;
    }

    setLoading(true);
    try {
      // 1. Get selected assignment (class)
      const cls = classes.find((c) => c.id === selectedClassId);
      if (!cls || !cls.batchId) {
        setStudents([]);
        setAttendance({});
        setLoading(false);
        return;
      }

      // 2. Fetch students from the assigned batch
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .eq("batch_id", cls.batchId)
        .order("roll", { ascending: true });

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        setStudents([]);
        setAttendance({});
        setLoading(false);
        return;
      }

      setStudents(studentsData || []);

      // 3. Fetch Existing Attendance for Date
      if (studentsData?.length > 0) {
        const studentIds = studentsData.map(s => s.id);
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("*")
          .in("student_id", studentIds)
          .eq("date", selectedDate)
          .eq("class_id", selectedClassId); // class_id references teaching_assignments.id

        if (attendanceError) {
          console.error("Error fetching attendance:", attendanceError);
          setAttendance({});
        } else {
          const attendanceMap = {};
          attendanceData?.forEach(r => {
            attendanceMap[r.student_id] = r.status;
          });
          setAttendance(attendanceMap);
        }
      } else {
        setAttendance({});
      }
    } catch (error) {
      console.error("Error fetching daily data:", error);
      setStudents([]);
      setAttendance({});
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
        const cls = classes.find((c) => c.id === selectedClassId);
        if (!cls || !cls.batchId) {
          setHistoryData([]);
          setLoading(false);
          return;
        }

        // Fetch students to report on
        const { data: studentsData } = await supabase
            .from("students")
            .select("id, full_name, roll")
            .eq("batch_id", cls.batchId)
            .order("roll", { ascending: true });
        
        if (!studentsData || studentsData.length === 0) {
            setHistoryData([]);
            setLoading(false);
            return;
        }

        const studentIds = studentsData.map(s => s.id);

        // Fetch aggregation (simplified)
        // Ideally use a database function or view for performance
        const { data: allAttendance } = await supabase
            .from("attendance")
            .select("student_id, status, date")
            .in("student_id", studentIds)
            .eq("class_id", selectedClassId) // Include class specific history
            .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]); // Last 30 days default

        
        const history = studentsData.map(student => {
            const records = allAttendance?.filter(r => r.student_id === student.id) || [];
            const total = records.length;
            const present = records.filter(r => r.status === "present").length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            
            return {
                ...student,
                totalClasses: total,
                presentClasses: present,
                percentage,
                isLow: percentage < 75 && total > 0
            };
        });

        setHistoryData(history);

    } catch (error) {
        console.error("Error fetching history:", error);
    } finally {
        setLoading(false);
    }
  };

  const setStudentStatus = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const getEffectiveStatus = useCallback(
    (studentId) => attendance[studentId] || "present",
    [attendance],
  );

  const handleSave = async () => {
    // Prevent double-click / spam clicking
    if (loading || !selectedClassId || students.length === 0) return;
    
    setLoading(true);
    try {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (!cls) {
        toast.error("Error: Class not found. Please refresh the page.");
        setLoading(false);
        return;
      }

      const subjectId = cls.subjectId || null;

      // Build updates for ALL students in this class, defaulting to "present"
      const updates = students.map((student) => {
        const statusForStudent = attendance[student.id] || "present";
        return {
          student_id: student.id,
          date: selectedDate,
          status: statusForStudent,
          class_id: selectedClassId,
          marked_by: teacherId,
          subject_id: subjectId,
        };
      });

      if (updates.length > 0) {
         const { error } = await supabase
           .from("attendance")
           .upsert(updates, { onConflict: "student_id, date, class_id" });
         
         if (error) throw error;
         toast.success("Attendance saved successfully!");
         // Optionally refresh to show saved state
         await fetchDailyData();
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(`Failed to save attendance: ${error.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const quickTotal = students.length;
  const quickCompleted = quickTotal > 0 && currentIndex >= quickTotal;
  const currentStudent = !quickCompleted ? students[currentIndex] : null;
  const progress = useMemo(() => {
    if (quickTotal === 0) return 0;
    const done = Math.min(currentIndex, quickTotal);
    return Math.round((done / quickTotal) * 100);
  }, [currentIndex, quickTotal]);

  const goPrev = useCallback(() => {
    if (quickTotal === 0) return;
    setCurrentIndex((i) => {
      if (i >= quickTotal) return Math.max(0, quickTotal - 1);
      return Math.max(0, i - 1);
    });
  }, [quickTotal]);

  const goNext = useCallback(() => {
    if (quickTotal === 0) return;
    setCurrentIndex((i) => {
      if (i >= quickTotal) return i;
      if (i < quickTotal - 1) return i + 1;
      return quickTotal; // completed state
    });
  }, [quickTotal]);

  const markAndAdvance = useCallback(
    (status) => {
      if (!currentStudent) return;
      setStudentStatus(currentStudent.id, status);
      setCurrentIndex((i) => {
        if (quickTotal === 0) return 0;
        if (i < quickTotal - 1) return i + 1;
        return quickTotal; // completed
      });
    },
    [currentStudent, quickTotal],
  );

  // Bonus: keyboard shortcuts in quick mode
  useEffect(() => {
    if (viewMode !== "quick") return;
    if (!selectedClassId) return;
    if (quickTotal === 0) return;

    const handler = (e) => {
      const tag = e.target?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }

      const k = e.key?.toLowerCase?.();
      if (k === "p") {
        e.preventDefault();
        markAndAdvance("present");
      } else if (k === "a") {
        e.preventDefault();
        markAndAdvance("absent");
      } else if (k === "l") {
        e.preventDefault();
        markAndAdvance("late");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewMode, selectedClassId, quickTotal, goPrev, goNext, markAndAdvance]);

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-purple-600 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-purple-600" />
              Attendance Management
            </CardTitle>
            <div className="flex gap-2">
                <Button 
                    variant={viewMode === "daily" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("daily")}
                    size="sm"
                >
                    <Calendar className="w-4 h-4 mr-2" /> Daily
                </Button>
                <Button 
                    variant={viewMode === "quick" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("quick")}
                    size="sm"
                >
                    <Users className="w-4 h-4 mr-2" /> Quick
                </Button>
                <Button 
                    variant={viewMode === "history" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("history")}
                    size="sm"
                >
                    <History className="w-4 h-4 mr-2" /> History
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Select Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} - {c.courseCode}{" "}
                    {c.academicUnit ? `Sem-${c.academicUnit}` : ""}{" "}
                    {c.section ? `(${c.section})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {viewMode !== "history" && (
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
                </div>
            )}
          </div>

          {/* Daily View */}
          {viewMode === "daily" && selectedClassId && (
            <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                    <p className="text-sm text-gray-500">
                        Click a status button to mark each student:{" "}
                        <span className="text-green-600 font-bold">Present</span>,{" "}
                        <span className="text-red-500 font-bold">Absent</span>, or{" "}
                        <span className="text-yellow-500 font-bold">Leave</span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allPresent = {};
                          students.forEach((s) => {
                            allPresent[s.id] = "present";
                          });
                          setAttendance(allPresent);
                        }}
                        disabled={students.length === 0}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Mark All Present
                      </Button>
                      <Button 
                        onClick={handleSave} 
                        disabled={loading || students.length === 0} 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? "Saving..." : "Save Daily Attendance"}
                      </Button>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Roll</th>
                                <th className="px-4 py-3 text-left">Student Name</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {students.map(student => {
                                const status = attendance[student.id] || "present"; // Default to present for ease
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-600">{student.roll}</td>
                                        <td className="px-4 py-3 text-gray-900">{student.full_name}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 justify-center items-center">
                                                <button
                                                    onClick={() => setStudentStatus(student.id, "present")}
                                                    className={`
                                                        px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all min-w-[70px]
                                                        ${status === 'present' 
                                                            ? 'bg-green-600 text-white shadow-md' 
                                                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                                        }
                                                    `}
                                                >
                                                    Present
                                                </button>
                                                <button
                                                    onClick={() => setStudentStatus(student.id, "absent")}
                                                    className={`
                                                        px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all min-w-[70px]
                                                        ${status === 'absent' 
                                                            ? 'bg-red-600 text-white shadow-md' 
                                                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                                        }
                                                    `}
                                                >
                                                    Absent
                                                </button>
                                                <button
                                                    onClick={() => setStudentStatus(student.id, "late")}
                                                    className={`
                                                        px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all min-w-[70px]
                                                        ${status === 'late' 
                                                            ? 'bg-yellow-600 text-white shadow-md' 
                                                            : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                                        }
                                                    `}
                                                >
                                                    Leave
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-500">
                                        No students found in this class.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* Quick Mode */}
          {viewMode === "quick" && selectedClassId && (
            <div className="space-y-4">
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-2 border-dashed rounded-lg">
                  <Users className="w-12 h-12 mb-2 opacity-50" />
                  <p>No students found in this class.</p>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm text-gray-700 font-medium">
                        {quickCompleted ? (
                          "Attendance Completed"
                        ) : (
                          <>
                            Student{" "}
                            <span className="font-bold text-purple-700">
                              {currentIndex + 1}
                            </span>{" "}
                            of{" "}
                            <span className="font-bold">{quickTotal}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Shortcuts: <span className="font-medium">P</span>{" "}
                        Present, <span className="font-medium">A</span> Absent,{" "}
                        <span className="font-medium">L</span> Leave,{" "}
                        <span className="font-medium">←</span> Prev,{" "}
                        <span className="font-medium">→</span> Next
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Marking UI */}
                  {!quickCompleted && currentStudent && (
                    <div className="bg-gradient-to-br from-purple-50 to-white border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                            Roll No
                          </div>
                          <div className="text-3xl font-bold text-gray-900 mt-1">
                            {currentStudent.roll || "-"}
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            {currentStudent.full_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Current</div>
                          <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            {getEffectiveStatus(currentStudent.id) === "late"
                              ? "leave"
                              : getEffectiveStatus(currentStudent.id)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => markAndAdvance("present")}
                          className="w-full rounded-xl px-4 py-4 font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" /> Present
                        </button>
                        <button
                          type="button"
                          onClick={() => markAndAdvance("absent")}
                          className="w-full rounded-xl px-4 py-4 font-bold text-white bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" /> Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => markAndAdvance("late")}
                          className="w-full rounded-xl px-4 py-4 font-bold text-white bg-yellow-600 hover:bg-yellow-700 transition flex items-center justify-center gap-2"
                        >
                          <Clock className="w-5 h-5" /> Leave
                        </button>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goPrev}
                          disabled={currentIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goNext}
                        >
                          Skip
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Review + Save */}
                  {quickCompleted && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-700 mt-0.5" />
                        <div>
                          <div className="font-semibold text-green-800">
                            Attendance Completed
                          </div>
                          <div className="text-sm text-green-700">
                            Review and edit before saving to the database.
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left">Roll</th>
                              <th className="px-4 py-3 text-left">Student</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {students.map((s) => {
                              const st = getEffectiveStatus(s.id);
                              return (
                                <tr key={s.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-600">
                                    {s.roll || "-"}
                                  </td>
                                  <td className="px-4 py-3 text-gray-900">
                                    {s.full_name}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2 justify-center items-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStudentStatus(s.id, "present")
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all min-w-[70px] ${
                                          st === "present"
                                            ? "bg-green-600 text-white shadow-md"
                                            : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                        }`}
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStudentStatus(s.id, "absent")
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all min-w-[70px] ${
                                          st === "absent"
                                            ? "bg-red-600 text-white shadow-md"
                                            : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                        }`}
                                      >
                                        Absent
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStudentStatus(s.id, "late")
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all min-w-[70px] ${
                                          st === "late"
                                            ? "bg-yellow-600 text-white shadow-md"
                                            : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                                        }`}
                                      >
                                        Leave
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentIndex(Math.max(0, quickTotal - 1))}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={loading || students.length === 0}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? "Saving..." : "Save All Attendance"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* History View */}
           {viewMode === "history" && selectedClassId && (
               <div className="space-y-4">
                   <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-md flex items-start gap-2">
                       <History className="w-4 h-4 mt-0.5 shrink-0" />
                       <p>Showing 30-day summary. Students with less than 75% attendance are highlighted.</p>
                   </div>
                   
                   <div className="border rounded-lg overflow-hidden">
                       <table className="w-full text-sm">
                           <thead className="bg-gray-50">
                               <tr>
                                   <th className="px-4 py-3 text-left">Name</th>
                                   <th className="px-4 py-3 text-center">Total Classes</th>
                                   <th className="px-4 py-3 text-center">Present</th>
                                   <th className="px-4 py-3 text-center">Attendance %</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y">
                               {historyData.map(record => (
                                   <tr key={record.id} className={record.isLow ? "bg-red-50" : "hover:bg-gray-50"}>
                                       <td className="px-4 py-3 font-medium">
                                           {record.full_name}
                                           {record.isLow && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Low</span>}
                                       </td>
                                       <td className="px-4 py-3 text-center text-gray-600">{record.totalClasses}</td>
                                       <td className="px-4 py-3 text-center text-green-600 font-medium">{record.presentClasses}</td>
                                       <td className="px-4 py-3 text-center">
                                           <span className={`font-bold ${record.isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                               {record.percentage}%
                                           </span>
                                       </td>
                                   </tr>
                               ))}
                               {historyData.length === 0 && (
                                   <tr>
                                       <td colSpan="4" className="p-8 text-center text-gray-500">
                                           No history data available.
                                       </td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           )}

           {!selectedClassId && (
               <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-2 border-dashed rounded-lg">
                   <UserCheck className="w-12 h-12 mb-2 opacity-50" />
                   <p>Please select a class to manage attendance.</p>
               </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

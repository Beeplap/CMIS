"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { 
  BookOpen, 
  Plus, 
  Download, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  FileText
} from "lucide-react";

export default function AssignmentsManager({ teacherId }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list', 'create', 'grading'
  const [assignments, setAssignments] = useState([]);
  const [teachingClasses, setTeachingClasses] = useState([]); // teaching_assignments with batch + subject
  
  // Create Form State
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    teaching_assignment_id: "",
    due_at: "",
  });
  
  // Grading State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]); // List of students + their submissions
  const [gradingValues, setGradingValues] = useState({}); // { studentId: { grade, feedback } }

  useEffect(() => {
    if (!teacherId) return;
    fetchTeachingClasses();
    fetchAssignments();
  }, [teacherId]);

  // Load subjects+batches this teacher teaches from teaching_assignments
  const fetchTeachingClasses = async () => {
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
      console.error("Error fetching teaching classes for assignments:", error);
      setTeachingClasses([]);
      return;
    }

    setTeachingClasses(data || []);
  };

  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        *,
        teaching_assignment:teaching_assignments(
          id,
          batch:batches(id, academic_unit, section, course:courses(code, name)),
          subject:subjects(id, name, code)
        )
      `,
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    } else {
      setAssignments(data || []);
    }
    setLoading(false);
  };

  const loadGradingView = async (assignment) => {
      setSelectedAssignment(assignment);
      setLoading(true);
      try {
        // 1. Get all students in the batch for this teaching assignment
        const batchId = assignment.teaching_assignment?.batch?.id;
        if (!batchId) {
          setSubmissions([]);
          setView("grading");
          return;
        }

        const { data: students } = await supabase
          .from("students")
          .select("id, full_name, roll")
          .eq("batch_id", batchId)
          .order("roll");
        
        // 2. Get submitted work
        const { data: submittedWork } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", assignment.id);
        
        // 3. Merge
        const merged = students?.map(student => {
            const sub = submittedWork?.find(s => s.student_id === student.id);
            return {
                ...student,
                submission: sub || null
            };
        });
        
        setSubmissions(merged || []);
        // Initialize grading values from existing submissions
        const initialValues = {};
        merged?.forEach(s => {
          if (s.submission) {
            initialValues[s.id] = {
              grade: s.submission.grade ?? "",
              feedback: s.submission.feedback ?? ""
            };
          }
        });
        setGradingValues(initialValues);
        setView("grading");
      } catch (error) {
          console.error("Error loading submissions:", error);
      } finally {
          setLoading(false);
      }
  };

  const handleCreate = async (e) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await supabase.from("assignments").insert({
        title: newAssignment.title,
        description: newAssignment.description || null,
        teaching_assignment_id: newAssignment.teaching_assignment_id,
        due_at: newAssignment.due_at,
        teacher_id: teacherId,
      });

      if (!error) {
        await fetchAssignments();
        setView("list");
        setNewAssignment({
          title: "",
          description: "",
          teaching_assignment_id: "",
          due_at: "",
        });
      } else {
        toast.error("Error creating assignment");
      }
      setLoading(false);
  };

  const handleGradeChange = (studentId, field, value) => {
    setGradingValues(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleGradeSave = async (studentId) => {
      if (!selectedAssignment) return;
      
      try {
        // Only allow grading if there's a submission (can't grade work that wasn't submitted)
        const studentSubmission = submissions.find(s => s.id === studentId);
        if (!studentSubmission?.submission) {
          toast.error("Cannot grade: Student has not submitted this assignment yet.");
          return;
        }

        const values = gradingValues[studentId] || {};
        const gradeValue = values.grade ? parseFloat(values.grade) : null;
        const feedbackValue = values.feedback?.trim() || null;

        // Update existing submission with grade/feedback
        const { error } = await supabase
          .from("submissions")
          .update({
            grade: gradeValue,
            feedback: feedbackValue,
            status: 'graded',
            updated_at: new Date().toISOString()
          })
          .eq("assignment_id", selectedAssignment.id)
          .eq("student_id", studentId);
        
        if (error) throw error;
        
        // Update local state
        setSubmissions(prev => prev.map(s => {
            if (s.id === studentId) {
                return { 
                    ...s, 
                    submission: { 
                      ...s.submission, 
                      grade: gradeValue, 
                      feedback: feedbackValue, 
                      status: 'graded' 
                    } 
                };
            }
            return s;
        }));

      } catch (err) {
          console.error("Grading error:", err);
          toast.error("Failed to save grade. Please try again.");
      }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="text-purple-600" />
                Assignments & Submissions
            </h2>
            {view === 'list' && (
                <Button onClick={() => setView('create')} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" /> New Assignment
                </Button>
            )}
            {view !== 'list' && (
                <Button variant="ghost" onClick={() => setView('list')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                </Button>
            )}
        </div>

        {/* List View */}
        {view === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map(assignment => (
                    <Card key={assignment.id} className="hover:shadow-lg transition cursor-pointer group" onClick={() => loadGradingView(assignment)}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                    {assignment.teaching_assignment?.subject?.name || "Subject"}
                                </span>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                            </div>
                            <CardTitle className="mt-2 text-lg line-clamp-1">{assignment.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10 w-full">
                                {assignment.description || "No description"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                Due:{" "}
                                {assignment.due_at
                                  ? new Date(assignment.due_at).toLocaleString()
                                  : "N/A"}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {assignments.length === 0 && !loading && (
                    <div className="col-span-full text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
                        <p className="text-gray-500">No active assignments</p>
                    </div>
                )}
            </div>
        )}

        {/* Create View */}
        {view === 'create' && (
            <Card className="max-w-2xl mx-auto">
                <CardHeader><CardTitle>Create New Assignment</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input required className="w-full p-2 border rounded" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Target Batch &amp; Subject
                          </label>
                          <select
                            required
                            className="w-full p-2 border rounded"
                            value={newAssignment.teaching_assignment_id}
                            onChange={(e) =>
                              setNewAssignment({
                                ...newAssignment,
                                teaching_assignment_id: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Subject &amp; Batch</option>
                            {teachingClasses.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.subject?.name || "Subject"} —{" "}
                                {t.batch?.course?.code || "Course"}{" "}
                                {t.batch?.academic_unit
                                  ? `Sem-${t.batch.academic_unit}`
                                  : ""}{" "}
                                {t.batch?.section
                                  ? `(${t.batch.section})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea className="w-full p-2 border rounded" rows={3} value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                              Due Date &amp; Time
                            </label>
                            <input
                              required
                              type="datetime-local"
                              className="w-full p-2 border rounded"
                              value={newAssignment.due_at}
                              onChange={(e) =>
                                setNewAssignment({
                                  ...newAssignment,
                                  due_at: e.target.value,
                                })
                              }
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                             <Button type="button" variant="ghost" onClick={() => setView('list')}>Cancel</Button>
                             <Button type="submit" disabled={loading}>Create Assignment</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        )}

        {/* Grading View */}
        {view === 'grading' && selectedAssignment && (
            <div className="space-y-6">
                <Card className="bg-purple-50 border-purple-100">
                    <CardContent className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900">{selectedAssignment.title}</h1>
                        <p className="text-gray-600 mt-2">{selectedAssignment.description}</p>
                        <div className="flex gap-4 mt-4 text-sm font-medium text-gray-500">
                            <span>Total Students: {submissions.length}</span>
                            <span>Submitted: {submissions.filter(s => s.submission).length}</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Student</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Submission</th>
                                <th className="px-4 py-3 text-left">Grade / Feedback</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {submissions.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{student.full_name}</td>
                                    <td className="px-4 py-3">
                                        {student.submission ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Submitted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 space-y-1">
                                        {student.submission?.content && (
                                          <p className="text-xs text-gray-600 mb-1 max-w-xs truncate">
                                            "{student.submission.content}"
                                          </p>
                                        )}
                                        {/* Detect link either from explicit file_url or inside content */}
                                        {(() => {
                                          const content = student.submission?.content || "";
                                          const urlMatch = content.match(/https?:\/\/\S+/);
                                          const inferredLink = urlMatch ? urlMatch[0] : null;
                                          const fileUrl = student.submission?.file_url || inferredLink;

                                          if (!fileUrl) {
                                            return (
                                              <span className="text-xs text-gray-400">
                                                No file or link
                                              </span>
                                            );
                                          }

                                          return (
                                            <a
                                              href={fileUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                                            >
                                              <Download className="w-3 h-3" /> Open Link / File
                                            </a>
                                          );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {student.submission ? (
                                          <div className="flex gap-2 items-center">
                                              <input 
                                                  type="number" 
                                                  placeholder="Grade" 
                                                  min="0"
                                                  max="100"
                                                  step="0.1"
                                                  className="w-20 p-1.5 border rounded text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                  value={gradingValues[student.id]?.grade ?? student.submission?.grade ?? ""}
                                                  onChange={(e) => handleGradeChange(student.id, "grade", e.target.value)}
                                                  onBlur={() => handleGradeSave(student.id)}
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Feedback..." 
                                                  className="flex-1 p-1.5 border rounded text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                  value={gradingValues[student.id]?.feedback ?? student.submission?.feedback ?? ""}
                                                  onChange={(e) => handleGradeChange(student.id, "feedback", e.target.value)}
                                                  onBlur={() => handleGradeSave(student.id)}
                                              />
                                          </div>
                                        ) : (
                                          <span className="text-xs text-gray-400 italic">No submission yet</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
}

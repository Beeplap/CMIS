"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import {
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  AlertCircle,
} from "lucide-react";

export default function StudentAssignmentsView({ studentId, batchId }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submittingId, setSubmittingId] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (studentId) fetchAssignments();
  }, [studentId, batchId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Prefer batchId passed from parent (student dashboard) to avoid extra query
      let effectiveBatchId = batchId;

      // Fallback: fetch the student's batch from DB if not provided
      if (!effectiveBatchId) {
        const { data: studentRow, error: studentError } = await supabase
          .from("students")
          .select("batch_id")
          .eq("id", studentId)
          .single();

        if (studentError || !studentRow?.batch_id) {
          setAssignments([]);
          setLoading(false);
          return;
        }

        effectiveBatchId = studentRow.batch_id;
      }

      // Find teaching_assignments (subject+batch) for this student's batch
      const { data: teachingAssignments, error: taError } = await supabase
        .from("teaching_assignments")
        .select("id, subject:subjects(name, code)")
        .eq("batch_id", effectiveBatchId);

      if (taError || !teachingAssignments || teachingAssignments.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const teachingIds = teachingAssignments.map((ta) => ta.id);

      const { data: assignmentData, error } = await supabase
        .from("assignments")
        .select(
          `
          *,
          teaching_assignment:teaching_assignments(
            id,
            subject:subjects(name, code)
          )
        `,
        )
        .in("teaching_assignment_id", teachingIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Fetch my submissions
      const { data: mySubmissions } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", studentId);

      // 3. Merge
      const merged = (assignmentData || []).map((assign) => {
        const sub = mySubmissions?.find((s) => s.assignment_id === assign.id);
        return { ...assign, submission: sub || null };
      });

      setAssignments(merged);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assignmentId) => {
    if (!submissionText.trim()) {
      toast.error("Please enter your submission (text or link) before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("submissions").insert({
        assignment_id: assignmentId,
        student_id: studentId,
        content: submissionText.trim(),
        status: "submitted",
      });

      if (error) throw error;

      // Refresh local state
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === assignmentId) {
            return {
              ...a,
              submission: {
                content: submissionText.trim(),
                status: "submitted",
                submitted_at: new Date().toISOString(),
              },
            };
          }
          return a;
        }),
      );
      setSubmissionText("");
      setSubmittingId(null);
      toast.success("Assignment submitted successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(`Failed to submit: ${err.message || "Please try again."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {assignments.map((assignment) => {
            const isSubmitted = !!assignment.submission;
            const isGraded = assignment.submission?.status === "graded";
            const isExpanded = submittingId === assignment.id;

            return (
                <Card key={assignment.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded uppercase tracking-wide">
                                    {assignment.teaching_assignment?.subject?.name || "Assignment"}
                                </span>
                                <CardTitle className="text-xl mt-2">{assignment.title}</CardTitle>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isGraded ? (
                                <span className="flex items-center gap-1 text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                                  <CheckCircle className="w-4 h-4" />{" "}
                                  {`Graded${
                                    assignment.submission.grade != null
                                      ? `: ${assignment.submission.grade}`
                                      : ""
                                  }`}
                                </span>
                              ) : isSubmitted ? (
                                <span className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                  <CheckCircle className="w-4 h-4" /> Submitted
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                                  <Clock className="w-4 h-4" /> Pending
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                Due:{" "}
                                {assignment.due_at
                                  ? new Date(
                                      assignment.due_at,
                                    ).toLocaleString()
                                  : "N/A"}
                              </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
                        
                        {assignment.submission?.feedback && (
                            <div className="bg-green-50 p-3 rounded border border-green-100 text-sm">
                                <p className="font-bold text-green-800">Teacher's Feedback:</p>
                                <p className="text-green-700">{assignment.submission.feedback}</p>
                            </div>
                        )}

                        {/* Submission Area */}
                        {!isSubmitted ? (
                            <div className="mt-4 pt-4 border-t">
                                {!isExpanded ? (
                                    <Button onClick={() => setSubmittingId(assignment.id)} variant="outline">
                                        <Upload className="w-4 h-4 mr-2" /> Submit Assignment
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <textarea 
                                            className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-purple-200 focus:outline-none"
                                            rows={3}
                                            placeholder="Type your answer or paste a link to your work here..."
                                            value={submissionText}
                                            onChange={e => setSubmissionText(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <Button 
                                              size="sm" 
                                              onClick={() => handleSubmit(assignment.id)}
                                              disabled={submitting || !submissionText.trim()}
                                            >
                                              {submitting ? "Submitting..." : "Submit Work"}
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              onClick={() => {
                                                setSubmittingId(null);
                                                setSubmissionText("");
                                              }}
                                              disabled={submitting}
                                            >
                                              Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t space-y-2 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" /> 
                                  <span>
                                    You submitted this on{" "}
                                    {new Date(
                                      assignment.submission.submitted_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {(() => {
                                  const content =
                                    assignment.submission?.content || "";
                                  const urlMatch =
                                    content.match(/https?:\/\/\S+/);
                                  const link = urlMatch ? urlMatch[0] : null;
                                  if (!link) return null;
                                  return (
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                      Open submitted link
                                    </a>
                                  );
                                })()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            );
        })}

        {assignments.length === 0 && !loading && (
             <div className="text-center p-12 text-gray-500 border-2 border-dashed rounded-lg bg-gray-50">
                 <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                 No assignments found for your class.
             </div>
        )}
      </div>
    </div>
  );
}

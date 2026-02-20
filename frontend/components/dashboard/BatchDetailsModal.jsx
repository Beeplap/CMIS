"use client";
import React, { useState, useEffect } from "react";
import { Dialog, Tab } from "@headlessui/react";
import { User, BookOpen, UserPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function BatchDetailsModal({ batch, isOpen, onClose }) {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignMode, setAssignMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && batch) {
      fetchBatchDetails();
      fetchUnassignedStudents(); // Pre-fetch for potential assignment
    }
  }, [isOpen, batch]);

  const fetchBatchDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students in this batch
      const { data: batchStudents } = await supabase
        .from("students")
        .select("*")
        .eq("batch_id", batch.id)
        .order("roll", { ascending: true }); // Should be numeric if formatted right

      setStudents(batchStudents || []);

      // 2. Fetch Teachers (Assignments)
      // Assuming 'teaching_assignments' links batch_id -> teacher_id -> users
      // This is a bit complex, might need a view or nested join
      // For now, let's just list the layout for teachers
      const { data: assignments } = await supabase
        .from("teaching_assignments")
        .select("*, subjects(*), teacher:users(*)")
        .eq("batch_id", batch.id);

      setTeachers(assignments || []);
    } catch (err) {
      console.error("Error fetching batch details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedStudents = async () => {
    try {
      // Fetch students with NO batch_id
      const { data } = await supabase
        .from("students")
        .select("*")
        .is("batch_id", null)
        .order("full_name");

      setUnassignedStudents(data || []);
    } catch (err) {
      console.error("Error fetching unassigned:", err);
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.size === 0) return;
    setLoading(true);
    try {
      const studentIds = Array.from(selectedStudents);

      // Call API to bulk update
      const res = await fetch("/api/students/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          batchId: batch.id,
        }),
      });

      if (res.ok) {
        // Refresh
        await fetchBatchDetails();
        await fetchUnassignedStudents();
        setAssignMode(false);
        setSelectedStudents(new Set());
      } else {
        toast.error("Failed to assign students");
      }
    } catch (err) {
      console.error("Error assigning:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (id) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudents(newSet);
  };

  if (!batch) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl rounded-xl bg-white p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-6 text-white flex justify-between items-start shrink-0">
            <div>
              <h2 className="text-2xl font-bold">
                {batch.course?.code} {batch.academic_unit}
              </h2>
              <p className="opacity-80 mt-1">
                Section {batch.section} • Year {batch.admission_year}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <Tab.Group>
            <div className="border-b px-6 shrink-0">
              <Tab.List className="flex gap-6 -mb-px">
                {["Students", "Teachers"].map((category) => (
                  <Tab
                    key={category}
                    className={({ selected }) =>
                      classNames(
                        "py-4 text-sm font-medium border-b-2 transition-colors outline-none",
                        selected
                          ? "border-purple-600 text-purple-600"
                          : "border-transparent text-gray-500 hover:text-gray-700",
                      )
                    }
                  >
                    {category}
                  </Tab>
                ))}
              </Tab.List>
            </div>

            <Tab.Panels className="p-6 overflow-y-auto flex-1 bg-gray-50">
              {/* Students Panel */}
              <Tab.Panel className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-500" />
                    Enrolled Students ({students.length})
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setAssignMode(!assignMode)}
                    variant={assignMode ? "secondary" : "default"}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {assignMode ? "Cancel Assignment" : "Add Students"}
                  </Button>
                </div>

                {assignMode && (
                  <div className="bg-white p-4 rounded-lg border shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-medium text-purple-800 mb-2">
                      Select Unassigned Students to Add:
                    </h4>
                    {unassignedStudents.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No unassigned students found.
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border rounded divide-y">
                        {unassignedStudents.map((student) => (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between p-2 hover:bg-purple-50 cursor-pointer ${selectedStudents.has(student.id) ? "bg-purple-50" : ""}`}
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <span className="text-sm font-medium">
                              {student.full_name}{" "}
                              <span className="text-gray-400 font-normal">
                                ({student.reg_no || "No Reg"})
                              </span>
                            </span>
                            {selectedStudents.has(student.id) && (
                              <Check className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end mt-4">
                      <Button
                        size="sm"
                        onClick={handleAssignStudents}
                        disabled={selectedStudents.size === 0 || loading}
                      >
                        {loading
                          ? "Adding..."
                          : `Add ${selectedStudents.size} Students`}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  {students.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No students enrolled yet.
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3">Roll No</th>
                          <th className="px-6 py-3">Full Name</th>
                          <th className="px-6 py-3">Reg. No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr
                            key={student.id}
                            className="bg-white border-b hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 font-bold text-gray-900">
                              {student.roll || "-"}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {student.full_name}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {student.reg_no || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Tab.Panel>

              {/* Teachers Panel */}
              <Tab.Panel className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    Subject Assignments
                  </h3>
                </div>

                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  {teachers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No teachers assigned yet.
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3">Subject</th>
                          <th className="px-6 py-3">Assigned Teacher</th>
                          <th className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((assign) => (
                          <tr
                            key={assign.id}
                            className="bg-white border-b hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {assign.subjects?.name}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {assign.teacher?.full_name || (
                                <span className="text-red-400 italic">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-800"
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

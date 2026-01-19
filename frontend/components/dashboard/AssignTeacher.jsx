"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, UserCheck, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import { Card, CardContent } from "@/components/ui/card";

export default function AssignTeacher() {
  const [assignments, setAssignments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    subject_id: "",
    teacher_id: ""
  });

  // Load initial data
  useEffect(() => {
    fetchBatches();
    fetchTeachers();
  }, []);

  // Use selectedBatchId for filtering assignments
  useEffect(() => {
    if (selectedBatchId) {
      fetchAssignments(selectedBatchId);
      fetchSubjectsForBatch(selectedBatchId);
    } else {
        setAssignments([]);
        setSubjects([]);
    }
  }, [selectedBatchId]);

  const fetchBatches = async () => {
    const res = await fetch("/api/batches");
    if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
        // Auto-select first batch if available
        if (data.batches?.length > 0 && !selectedBatchId) {
            setSelectedBatchId(data.batches[0].id);
        }
    }
  };

  const fetchTeachers = async () => {
    // Assuming we have a way to fetch teachers, reusing users endpoint or logic from admin page
    // For now, let's fetch all users and filter. 
    // Ideally, create /api/teachers endpoint. 
    // BUT we can assume props or fetch from users table via existing patterns.
    // Let's assume the component will be used where teachers list is available or fetch fresh.
    // For standalone, let's fetch profiles if possible. 
    // Wait, the AdminPage has teachers state. Maybe we pass it as prop?
    // To make it self-contained, let's fetch from the generic user fetcher or just assume we have it.
    // Let's rely on a helper or just re-fetch users.
    const { supabase } = await import("@/lib/supabaseClient"); 
    const { data } = await supabase.from("users").select("*").eq("role", "teacher");
    if (data) setTeachers(data);
  };

  const fetchAssignments = async (batchId) => {
    const res = await fetch(`/api/teaching-assignments?batchId=${batchId}`);
    if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
    }
  };

  const fetchSubjectsForBatch = async (batchId) => {
      const batch = batches.find(b => b.id === batchId);
      if(!batch || !batch.course) return;

      // Fetch subjects for this course & academic unit
      const res = await fetch(`/api/subjects?course_id=${batch.course.id}&semester=${batch.academic_unit}`);
      if(res.ok) {
          const data = await res.json();
          setSubjects(data.subjects || []);
      }
  };

  const handleAssign = async () => {
      if(!selectedBatchId || !newAssignment.subject_id || !newAssignment.teacher_id) return;
      setLoading(true);
      try {
          const res = await fetch("/api/teaching-assignments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  batch_id: selectedBatchId,
                  subject_id: newAssignment.subject_id,
                  teacher_id: newAssignment.teacher_id
              })
          });
          
          if(res.ok) {
              setIsModalOpen(false);
              fetchAssignments(selectedBatchId);
              setNewAssignment({ subject_id: "", teacher_id: "" });
          } else {
              const json = await res.json();
              alert(json.error || "Failed to assign teacher");
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };
  
  const handleDelete = async (id) => {
      if(!confirm("Remove this teacher assignment?")) return;
      await fetch(`/api/teaching-assignments?id=${id}`, { method: "DELETE" });
      fetchAssignments(selectedBatchId);
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
           <div>
               <h3 className="text-lg font-semibold text-gray-800">Teaching Assignments</h3>
               <p className="text-sm text-gray-500">Assign teachers to subjects for a specific batch.</p>
           </div>
           
           <div className="flex items-center gap-3">
               <select 
                className="border rounded-md px-3 py-2 bg-white"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
               >
                   <option value="">Select a Batch</option>
                   {batches.map(b => (
                       <option key={b.id} value={b.id}>
                           {b.course?.code} {b.academic_unit} {b.section ? `(${b.section})` : ''} - {b.admission_year}
                       </option>
                   ))}
               </select>
               
               <Button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-indigo-600 hover:bg-indigo-700" 
                disabled={!selectedBatchId}
               >
                 <Plus className="w-4 h-4 mr-2"/> Assign Teacher
               </Button>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {assignments.map(a => (
               <Card key={a.id} className="hover:shadow-md transition-shadow relative group">
                   <CardContent className="p-4">
                       <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                           <BookOpen className="w-4 h-4 text-purple-500"/>
                           {a.subject?.name}
                       </h4>
                       <p className="text-xs text-gray-500 mb-3 ml-6">{a.subject?.code}</p>
                       
                       <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                               {a.teacher?.full_name?.charAt(0)}
                           </div>
                           <div className="overflow-hidden">
                               <p className="text-sm font-medium text-gray-800 truncate">{a.teacher?.full_name}</p>
                               <p className="text-[10px] text-gray-500 truncate">{a.teacher?.email}</p>
                           </div>
                       </div>
                       
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(a.id)}
                        >
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                   </CardContent>
               </Card>
           ))}
           {selectedBatchId && assignments.length === 0 && (
               <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
                   No teachers assigned to this batch yet.
               </div>
           )}
           {!selectedBatchId && (
               <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl">
                   Please select a batch to view assignments.
               </div>
           )}
       </div>

      {/* Assign Teacher Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-bold mb-4">Assign Teacher to Subject</Dialog.Title>
            
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select 
                    className="w-full border rounded p-2"
                    value={newAssignment.subject_id}
                    onChange={(e) => setNewAssignment({...newAssignment, subject_id: e.target.value})}
                >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
               </div>

               <div>
                <label className="block text-sm font-medium mb-1">Teacher</label>
                <select 
                    className="w-full border rounded p-2"
                    value={newAssignment.teacher_id}
                    onChange={(e) => setNewAssignment({...newAssignment, teacher_id: e.target.value})}
                >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                </select>
               </div>
               
               <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={loading} className="bg-indigo-600">
                  {loading ? "Assigning..." : "Assign Teacher"}
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

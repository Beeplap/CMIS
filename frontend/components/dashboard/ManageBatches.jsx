"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog } from "@headlessui/react";

export default function ManageBatches() {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newBatch, setNewBatch] = useState({
    course_id: "",
    academic_unit: "",
    section: "A",
    admission_year: new Date().getFullYear(),
  });

  // Fetch initial data
  useEffect(() => {
    fetchBatches();
    fetchCourses();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const handleCreateBatch = async () => {
    if (!newBatch.course_id || !newBatch.academic_unit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBatch),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchBatches();
        // Reset form but keep year/section as they might be repetitive
        setNewBatch(prev => ({ ...prev, course_id: "", academic_unit: "" }));
      } else {
        const json = await res.json();
        alert(json.error || "Failed to create batch");
      }
    } catch (error) {
      console.error("Error creating batch:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!confirm("Are you sure? This will delete all assignments and student links for this batch.")) return;
    try {
      const res = await fetch(`/api/batches?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchBatches();
      else alert("Failed to delete batch");
    } catch (error) {
      console.error("Error deleting batch:", error);
    }
  };

  // Helper to get semester/year options based on selected course
  const getAcademicUnitOptions = () => {
    const course = courses.find(c => c.id === newBatch.course_id);
    if (!course) return [];
    return Array.from({ length: course.duration }, (_, i) => i + 1);
  };

  const getCourseType = () => {
    const course = courses.find(c => c.id === newBatch.course_id);
    return course?.type === 'Yearly' ? 'Year' : 'Semester';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Academic Batches</h3>
        <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-2" /> Create Batch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((batch) => (
          <div key={batch.id} className="p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow relative group">
            <h4 className="font-bold text-lg text-gray-800">
              {batch.course?.code} {batch.academic_unit <= 8 ? (batch.course?.type === 'Yearly' ? 'Year ' : 'Sem ') + batch.academic_unit : batch.academic_unit}
            </h4>
            <div className="flex gap-2 mb-2 mt-1">
               {batch.section && (
                 <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200">
                   Sec {batch.section}
                 </span>
               )}
               <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex items-center gap-1 border border-gray-200">
                 <Calendar className="w-3 h-3"/> {batch.admission_year}
               </span>
            </div>
            
            <p className="text-xs text-gray-400 mt-2">ID: ...{batch.id.slice(-6)}</p>

            <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteBatch(batch.id)}
            >
                <Trash2 className="w-4 h-4"/>
            </Button>
          </div>
        ))}
         {batches.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                No active batches found. Create one to get started.
            </div>
        )}
      </div>

      {/* Create Batch Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-bold mb-4">Create New Batch</Dialog.Title>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Course</label>
                <select 
                    className="w-full border rounded p-2"
                    value={newBatch.course_id}
                    onChange={(e) => setNewBatch({ ...newBatch, course_id: e.target.value, academic_unit: "" })}
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                   {newBatch.course_id ? getCourseType() : "Academic Unit"}
                </label>
                <select 
                    className="w-full border rounded p-2"
                    value={newBatch.academic_unit}
                    onChange={(e) => setNewBatch({ ...newBatch, academic_unit: e.target.value })}
                    disabled={!newBatch.course_id}
                >
                  <option value="">Select Level</option>
                  {getAcademicUnitOptions().map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Section</label>
                    <input 
                        type="text" 
                        className="w-full border rounded p-2"
                        value={newBatch.section}
                        onChange={(e) => setNewBatch({ ...newBatch, section: e.target.value })}
                        placeholder="A"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Admission Year</label>
                    <input 
                        type="number" 
                        className="w-full border rounded p-2"
                        value={newBatch.admission_year}
                        onChange={(e) => setNewBatch({ ...newBatch, admission_year: e.target.value })}
                    />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateBatch} disabled={loading} className="bg-purple-600">
                  {loading ? "Creating..." : "Create Batch"}
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

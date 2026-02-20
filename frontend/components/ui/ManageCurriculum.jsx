"use client";
import React, { useState, useEffect, Fragment } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, Transition } from "@headlessui/react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ManageCurriculum() {
  const [deleteSubjectConfirm, setDeleteSubjectConfirm] = useState({ open: false, subject: null });
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null); // ID of expanded course

  // Add Subject Modal State
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    course_id: "",
    semester: "",
    credits: 3,
    type: "Core"
  });
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Add Course Modal State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    code: "",
    type: "Semester",
    duration: 8
  });

useEffect(() => {
  if (!modalSuccess) return;
  const t = setTimeout(() => setModalSuccess(""), 2000);
  return () => clearTimeout(t);
}, [modalSuccess]);

  useEffect(() => {
    fetchCoursesAndSubjects();
  }, []);

  const fetchCoursesAndSubjects = async () => {
    setLoading(true);
    try {
      const [resCourses, resSubjects] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/subjects")
      ]);
      const jsonCourses = await resCourses.json();
      const jsonSubjects = await resSubjects.json();
      
      setCourses(jsonCourses.courses || []);
      setSubjects(jsonSubjects.subjects || []);
    } catch (error) {
      console.error("Failed to fetch curriculum data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectStart = (courseId, semester) => {
    setNewSubject({ name: "", code: "", course_id: courseId, semester: semester, credits: 3, type: "Core" });
    setModalError("");
    setModalSuccess("");
    setShowAddSubject(true);
  };

const handleAddSubjectSubmit = async (closeAfter = false) => {
  setModalError("");
  setModalSuccess("");

  try {
    if (!newSubject.name || !newSubject.code) {
      throw new Error("Name and Code are required");
    }

    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSubject)
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to add subject");
    }

    // ✅ Add subject instantly to UI (NO REFRESH)
    setSubjects(prev => [...prev, json.subject]);

    // ✅ Reset only form fields (keep course & semester)
    setNewSubject(prev => ({
      ...prev,
      name: "",
      code: "",
      credits: 3,
      type: "Core"
    }));

    setModalSuccess("Subject added successfully ");

    if (closeAfter) {
      setTimeout(() => setShowAddSubject(false), 300);
    }

  } catch (error) {
    setModalError(error.message);
  }
};


  const handleAddCourseSubmit = async () => {
    setModalError("");
    setModalSuccess("");
    try {
      if(!newCourse.name || !newCourse.code || !newCourse.duration) {
        throw new Error("All fields are required");
      }

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse)
      });

      if(!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add course");
      }

      setModalSuccess("Course added successfully!");
      fetchCoursesAndSubjects();
      setShowAddCourse(false);
      // Reset form
      setNewCourse({ name: "", code: "", type: "Semester", duration: 8 });
      
    } catch (error) {
      setModalError(error.message);
    }
  };

  // Group subjects by Course -> Semester
  const getSubjects = (courseId, semester) => {
    return subjects.filter(s => s.course_id === courseId && s.semester == semester);
  };

  if (loading) return <div>Loading curriculum...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold">Curriculum Management</h2>
           <p className="text-sm text-gray-500">Manage courses, semesters, and subjects</p>
        </div>
        <Button onClick={() => {
            setModalError("");
            setModalSuccess("");
            setShowAddCourse(true);
        }} className="bg-purple-600">
            <Plus className="w-4 h-4 mr-2"/> Add Curriculum
        </Button>
      </div>

      <div className="grid gap-4">
        {courses.map(course => (
          <Card key={course.id} className="overflow-hidden">
            <div 
              className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
            >
              <div className="flex items-center gap-3">
                 {expandedCourse === course.id ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                 <div>
                    <h3 className="font-bold text-lg">{course.name} ({course.code})</h3>
                    <p className="text-xs text-gray-500">{course.type} System • {course.duration} {course.type === 'Semester' ? 'Semesters' : 'Years'}</p>
                 </div>
              </div>
              <div className="text-sm font-medium text-gray-500">
                {subjects.filter(s => s.course_id === course.id).length} Subjects
              </div>
            </div>

            {expandedCourse === course.id && (
              <div className="p-4 bg-white border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: course.duration }, (_, i) => i + 1).map(sem => (
                        <div key={sem} className="border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b">
                                <h4 className="font-semibold text-gray-700">{course.type === 'Semester' ? 'Semester' : 'Year'} {sem}</h4>
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50" onClick={() => handleAddSubjectStart(course.id, sem)}>
                                    <Plus className="w-3 h-3 mr-1"/> Add Subject
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                {getSubjects(course.id, sem).length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">No subjects added</p>
                                ) : (
                                    getSubjects(course.id, sem).map(sub => (
                                        <div key={sub.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm group">
                                            <div>
                                                <span className="font-medium">{sub.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">({sub.code})</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteSubjectConfirm({ open: true, subject: sub });
                                            }}>
                                                <Trash2 className="w-3 h-3"/>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Headless UI Modal for Add Subject */}
      <Transition appear show={showAddSubject} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowAddSubject(false)}>
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 border">
              <Dialog.Title className="text-lg font-bold mb-4">Add Subject</Dialog.Title>
              
              {modalError && <p className="text-sm text-red-600 mb-3">{modalError}</p>}
              {modalSuccess && <p className="text-sm text-green-600 mb-3">{modalSuccess}</p>}

              <div className="space-y-4">
                  <div>
                      <label className="text-sm font-medium">Subject Name</label>
                      <Input value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-sm font-medium">Subject Code</label>
                      <Input value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} placeholder="e.g. CACS101"/>
                  </div>
                  <div className="flex gap-4">
                      <div className="flex-1">
                           <label className="text-sm font-medium">Credits</label>
                           <Input type="number" value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: e.target.value})} />
                      </div>
                       <div className="flex-1">
                           <label className="text-sm font-medium">Type</label>
                           <select 
                             className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                             value={newSubject.type} 
                             onChange={e => setNewSubject({...newSubject, type: e.target.value})}
                           >
                              <option value="Core">Core</option>
                              <option value="Elective">Elective</option>
                           </select>
                      </div>
                  </div>
              </div>

             <div className="flex justify-between mt-6">
  <Button
    variant="ghost"
    onClick={() => setShowAddSubject(false)}
  >
    Close
  </Button>

  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={() => handleAddSubjectSubmit(false)}
    >
      Add Another
    </Button>

    <Button
      onClick={() => handleAddSubjectSubmit(true)}
      className="bg-purple-600 text-white hover:bg-purple-700"
    >
      Add & Close
    </Button>
  </div>
</div>

            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Headless UI Modal for Add Course */}
      <Transition appear show={showAddCourse} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowAddCourse(false)}>
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 border">
              <Dialog.Title className="text-lg font-bold mb-4">Add Curriculum</Dialog.Title>
              
              {modalError && <p className="text-sm text-red-600 mb-3">{modalError}</p>}
              {modalSuccess && <p className="text-sm text-green-600 mb-3">{modalSuccess}</p>}

              <div className="space-y-4">
                  <div>
                      <label className="text-sm font-medium">Course Name</label>
                      <Input value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} placeholder="e.g. Bachelor of Arts"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Course Code</label>
                      <Input value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value})} placeholder="e.g. BA"/>
                  </div>
                  <div className="flex gap-4">
                       <div className="flex-1">
                           <label className="text-sm font-medium">System Type</label>
                           <select 
                             className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                             value={newCourse.type} 
                             onChange={e => setNewCourse({...newCourse, type: e.target.value})}
                           >
                              <option value="Semester">Semester</option>
                              <option value="Yearly">Yearly</option>
                           </select>
                      </div>
                      <div className="flex-1">
                           <label className="text-sm font-medium">Duration ({newCourse.type === 'Semester' ? 'Semesters' : 'Years'})</label>
                           <Input type="number" value={newCourse.duration} onChange={e => setNewCourse({...newCourse, duration: parseInt(e.target.value)})} />
                      </div>
                  </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                  <Button variant="ghost" onClick={() => setShowAddCourse(false)}>Cancel</Button>
                  <Button onClick={handleAddCourseSubmit} className="bg-purple-600 text-white hover:bg-purple-700">Add Course</Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      <ConfirmDialog
        open={deleteSubjectConfirm.open}
        onClose={() => setDeleteSubjectConfirm({ open: false, subject: null })}
        onConfirm={async () => {
          const sub = deleteSubjectConfirm.subject;
          setDeleteSubjectConfirm({ open: false, subject: null });
          if (!sub) return;
          await fetch("/api/subjects", { method: "DELETE", body: JSON.stringify({ id: sub.id }) });
          fetchCoursesAndSubjects();
        }}
        title="Delete Subject"
        message={`Are you sure you want to delete "${deleteSubjectConfirm.subject?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

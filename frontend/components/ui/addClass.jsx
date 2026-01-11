"use client";
import React, { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "./button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./card";

export default function AddClass({ open, onClose, profiles = [], onCreated }) {
  const [newClass, setNewClass] = useState({
    course: "", // stores course code/name
    semester: "",
    subject: "",
    room_number: "",
    teacher_id: "",
  });
  
  // Data for cascading dropdowns
  const [courses, setCourses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch courses on mount
  useEffect(() => {
    if(open) {
        fetch('/api/courses')
            .then(res => res.json())
            .then(data => setCourses(data.courses || []))
            .catch(console.error);
    }
  }, [open]);

  // Fetch subjects when Course or Semester changes
  useEffect(() => {
      if(newClass.course && newClass.semester) {
          // Find course ID from selected course code/name
          const selectedCourse = courses.find(c => c.code === newClass.course || c.name === newClass.course); 
          // Note: Backend 'classes' might expect simple string for course.
          // If we want to be precise we should store IDs, but existing data uses Strings likely.
          // Let's rely on the Course Code (e.g. BCA) as the stored value.
          
          if(selectedCourse) {
             fetch(`/api/subjects?course_id=${selectedCourse.id}&semester=${newClass.semester}`)
                .then(res => res.json())
                .then(data => setAvailableSubjects(data.subjects || []))
                .catch(console.error);
          }
      } else {
          setAvailableSubjects([]);
      }
  }, [newClass.course, newClass.semester, courses]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClass),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to add class");
      setSuccess("Class assigned successfully");
      setNewClass({
        course: "",
        semester: "",
        subject: "",
        room_number: "",
        teacher_id: "",
      });
      if (typeof onCreated === "function") onCreated(json.class || null);
      // close after short delay
      setTimeout(() => onClose && onClose(), 500);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const getSemesterOptions = () => {
      const c = courses.find(course => course.code === newClass.course);
      if(!c) return [];
      return Array.from({ length: c.duration }, (_, i) => i + 1);
  };
  
  const isYearly = () => {
      const c = courses.find(course => course.code === newClass.course);
      return c?.type === 'Yearly';
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg border border-gray-300 dark:border-gray-700">
            <Card className="shadow-none border-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Assign Class
                </CardTitle>
                <div className="text-xs opacity-70">
                  Assign a class to a teacher
                </div>
              </CardHeader>

              <CardContent>
                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                {success && (
                  <p className="text-sm text-green-600 mb-2">{success}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm">Course</label>
                    <select
                        value={newClass.course}
                        onChange={(e) => setNewClass({ ...newClass, course: e.target.value, semester: "", subject: "" })}
                        className="w-full border rounded-md px-3 h-10 bg-white/80 dark:bg-black/20"
                    >
                        <option value="">Select Course</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm">{isYearly() ? 'Year' : 'Semester'}</label>
                     <select
                        value={newClass.semester}
                        onChange={(e) => setNewClass({ ...newClass, semester: e.target.value, subject: "" })}
                        className="w-full border rounded-md px-3 h-10 bg-white/80 dark:bg-black/20"
                        disabled={!newClass.course}
                    >
                        <option value="">Select {isYearly() ? 'Year' : 'Semester'}</option>
                        {getSemesterOptions().map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm">Subject</label>
                     <select
                        value={newClass.subject}
                        onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                        className="w-full border rounded-md px-3 h-10 bg-white/80 dark:bg-black/20"
                        disabled={!newClass.semester}
                    >
                        <option value="">Select Subject</option>
                        {availableSubjects.map(sub => (
                            <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
                        ))}
                         {availableSubjects.length === 0 && newClass.semester && (
                             <option disabled>No subjects found for this Sem</option>
                         )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm">Room number</label>
                    <input
                      type="text"
                      value={newClass.room_number}
                      onChange={(e) =>
                        setNewClass({
                          ...newClass,
                          room_number: e.target.value,
                        })
                      }
                      className="w-full border rounded-md px-3 h-10 bg-white/80 dark:bg-black/20"
                      placeholder="Room 101"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm">Assign to Teacher</label>
                    <select
                      value={newClass.teacher_id}
                      onChange={(e) =>
                        setNewClass({ ...newClass, teacher_id: e.target.value })
                      }
                      className="w-full border rounded-md px-3 h-10 bg-white/80 dark:bg-black/20"
                    >
                      <option value="">Select a teacher</option>
                      {profiles
                        .filter((p) => p.role === "teacher")
                        .map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.full_name} ({teacher.email})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-400 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    !newClass.course ||
                    !newClass.semester ||
                    !newClass.subject ||
                    !newClass.teacher_id
                  }
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200"
                >
                  {loading ? "Assigning…" : "Assign Class"}
                </Button>
              </CardFooter>
            </Card>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}

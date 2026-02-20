"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  BookOpen,
  User as UserIcon,
  Calendar,
  TrendingUp,
} from "lucide-react";

// Components
import StudentAttendanceView from "@/components/dashboard/StudentAttendanceView";
import StudentAssignmentsView from "@/components/dashboard/StudentAssignmentsView";
import StudentMarksView from "@/components/dashboard/StudentMarksView";
import StudentNoticesView from "@/components/dashboard/StudentNoticesView";
import StudentProfile from "@/components/dashboard/StudentProfile";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    present: 0,
    percentage: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          router.replace("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", authUser.id)
          .single();

        if (profile?.role !== "student") {
          router.replace("/login"); // or appropriate dashboard
          return;
        }

        setUser(authUser);

        const { data: student } = await supabase
          .from("students")
          .select(
            "*, batch:batches(academic_unit, section, course:courses(code))",
          )
          .eq("id", authUser.id)
          .single();

        setStudentData(student);

        // Fetch overall attendance summary for this student
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", authUser.id);

        if (attendanceError) {
          console.error("Error fetching attendance summary:", attendanceError);
          setAttendanceSummary({ total: 0, present: 0, percentage: 0 });
        } else if (attendanceData) {
          const total = attendanceData.length;
          const present = attendanceData.filter(
            (r) => r.status === "present",
          ).length;
          const percentage =
            total > 0 ? Math.round((present / total) * 100) : 0;
          setAttendanceSummary({ total, present, percentage });
        } else {
          setAttendanceSummary({ total: 0, present: 0, percentage: 0 });
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const displayName = studentData?.full_name || "Student";
  const batchInfo = studentData?.batch
    ? `${studentData.batch.course?.code} ${studentData.batch.academic_unit} (${studentData.batch.section})`
    : "No Batch Assigned";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        role="student"
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto h-screen">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden mb-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Student Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Menu</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        </div>

        {currentView === "dashboard" && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {displayName}!
                  </h1>
                  <p className="opacity-90">
                    Batch: {batchInfo} | Reg.No: {studentData?.reg_no || "N/A"}
                  </p>
                </div>
                <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                  <p className="text-sm font-medium">Academic Year</p>
                  <p className="text-xl font-bold">2023-2027</p>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Attendance Card */}
              <Card
                className="hover:shadow-lg transition cursor-pointer"
                onClick={() => setCurrentView("attendance")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full text-green-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Attendance
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {attendanceSummary.percentage}%
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        attendanceSummary.percentage < 75
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      Click to view details
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Assignments */}
              <Card
                className="hover:shadow-lg transition cursor-pointer"
                onClick={() => setCurrentView("assignments")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Assignments
                    </p>
                    <p className="text-2xl font-bold text-gray-900">Check</p>
                    <p className="text-xs text-gray-500 mt-1">
                      View pending tasks
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notices */}
              <Card
                className="hover:shadow-lg transition cursor-pointer"
                onClick={() => setCurrentView("notices")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Notices</p>
                    <p className="text-2xl font-bold text-gray-900">Latest</p>
                    <p className="text-xs text-gray-500 mt-1">Stay updated</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity / Notices Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StudentNoticesView studentId={user?.id} />
              {/* Can add another widget here, e.g. upcoming schedule */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No upcoming classes scheduled for today.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {currentView === "attendance" && (
          <StudentAttendanceView studentId={user?.id} />
        )}

        {currentView === "assignments" && (
          <StudentAssignmentsView
            studentId={user?.id}
            batchId={studentData?.batch_id}
          />
        )}

        {currentView === "marks" && <StudentMarksView studentId={user?.id} />}

        {currentView === "notices" && (
          <StudentNoticesView studentId={user?.id} />
        )}

        {currentView === "profile" && (
          <StudentProfile studentData={studentData} user={user} />
        )}
      </main>
    </div>
  );
}

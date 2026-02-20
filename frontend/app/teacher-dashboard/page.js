"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/useSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/ui/notificationBell";
import {
  Bell,
  Users,
  Clock,
  BookOpen,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  AlertCircle,
  FileText,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

// Imported Components
import MarksSection from "@/components/dashboard/MarksSection";
import StudentPerformance from "@/components/dashboard/StudentPerformance";
import NoticesBoard from "@/components/dashboard/NoticesBoard";
import TeacherProfile from "@/components/dashboard/TeacherProfile";
import AttendanceManager from "@/components/dashboard/AttendanceManager";
import AssignmentsManager from "@/components/dashboard/AssignmentsManager";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [teacherRecord, setTeacherRecord] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleCollapsed,
  } = useSidebar();
  const [attendanceStats, setAttendanceStats] = useState({
    todayTotal: 0,
    todaySuccessful: 0,
    todayMissed: 0,
    timePercentages: {
      day: 0,
      week: 0,
      month: 0,
      threeMonths: 0,
      sixMonths: 0,
      year: 0,
    },
  });
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

        setUser(authUser);
        setUserId(authUser.id);
        setEmail(authUser.email || "");

        // Fetch user profile
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (userProfile) setProfile(userProfile);

        // Fetch teacher record
        const { data: teacherRec } = await supabase
          .from("teachers")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (teacherRec) setTeacherRecord(teacherRec);

        const teacherName = teacherRec?.full_name?.trim();
        const userName = userProfile?.full_name?.trim();
        setFullName(teacherName || userName || "Teacher");

        // Fetch assigned classes from teaching_assignments
        const { data: assignments, error } = await supabase
          .from("teaching_assignments")
          .select(
            `
            id,
            batch:batches(id, academic_unit, section, course:courses(code, name)),
            subject:subjects(id, name, code)
          `,
          )
          .eq("teacher_id", authUser.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching assignments:", error);
        }

        const mappedClasses = (assignments || []).map((assignment) => ({
          id: assignment.id,
          subject: assignment.subject?.name || "Unknown Subject",
          course: assignment.batch?.course?.code || "Unknown Course",
          grade: assignment.batch?.academic_unit || "",
          section: assignment.batch?.section || "",
          time: "TBD", // Not currently stored in teaching_assignments
          room_number: "TBD", // Not currently stored in teaching_assignments
        }));

        setAssignedClasses(mappedClasses);
        await fetchAttendanceStats(authUser.id, mappedClasses);
      } catch (error) {
        console.error("Error fetching user:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
        setClassesLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Optimized attendance stats - fetch all data in one query instead of multiple
  const fetchAttendanceStats = async (teacherId, classes) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Single query to fetch all attendance records for this teacher (last year)
      const { data: allAttendance, error } = await supabase
        .from("attendance")
        .select("date, subject_id")
        .eq("marked_by", teacherId)
        .gte("date", yearAgo)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching attendance stats:", error);
        return;
      }

      // Calculate today's stats
      const todayAttendance = allAttendance?.filter((a) => a.date === today) || [];
      const todayTotal = classes.length;
      const todayUniqueSubjects = new Set(
        todayAttendance.map((a) => a.subject_id).filter(Boolean),
      ).size;
      const todaySuccessful = todayUniqueSubjects || 0;
      const todayMissed = Math.max(0, todayTotal - todaySuccessful);

      // Calculate time percentages for different periods
      const timePercentages = {};
      const PERIOD_DURATION = 45;
      const now = new Date();
      const ranges = {
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        threeMonths: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        sixMonths: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      };

      for (const [period, startDate] of Object.entries(ranges)) {
        const startDateStr = startDate.toISOString().split("T")[0];
        const periodRecords = allAttendance?.filter(
          (r) => r.date >= startDateStr,
        ) || [];

        if (periodRecords.length > 0) {
          const uniqueDays = new Set(periodRecords.map((r) => r.date)).size;
          const totalTimeSpent = uniqueDays * PERIOD_DURATION * classes.length;
          const daysInRange = Math.ceil(
            (now - startDate) / (24 * 60 * 60 * 1000),
          );
          const workingDays = Math.ceil((daysInRange / 7) * 5);
          const expectedTime = workingDays * PERIOD_DURATION * classes.length;
          timePercentages[period] =
            expectedTime > 0
              ? Math.min(100, Math.round((totalTimeSpent / expectedTime) * 100))
              : 0;
        } else {
          timePercentages[period] = 0;
        }
      }

      setAttendanceStats({
        todayTotal,
        todaySuccessful,
        todayMissed,
        timePercentages,
      });
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayName = fullName?.trim() ? fullName.trim() : "Teacher";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar
          role="teacher"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleCollapsed}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <main
          className={`flex-1 p-6 transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-0 sm:ml-0"}`}
        >
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {currentView === "dashboard"
                    ? "Teacher Dashboard"
                    : currentView.charAt(0).toUpperCase() +
                      currentView.slice(1)}
                </h1>
                <p className="text-sm text-gray-500">
                  {currentView === "dashboard"
                    ? `Welcome back, ${displayName}`
                    : `Manage your ${currentView}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <NotificationBell userRole="teacher" userId={userId} />
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-full sm:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Users className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-6">
            {currentView === "dashboard" && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Total Classes Today
                          </p>
                          <h3 className="text-3xl font-bold text-gray-900 mt-2">
                            {attendanceStats.todayTotal}
                          </h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Classes Completed
                          </p>
                          <h3 className="text-3xl font-bold text-gray-900 mt-2">
                            {attendanceStats.todaySuccessful}
                          </h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Classes Pending
                          </p>
                          <h3 className="text-3xl font-bold text-gray-900 mt-2">
                            {attendanceStats.todayMissed}
                          </h3>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <AlertCircle className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Assigned Classes List */}
                  <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        Today's Schedule / Assigned Classes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">
                                Subject
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">
                                Class
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">
                                Time
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">
                                Room
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {assignedClasses.length === 0 ? (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="text-center py-4 text-gray-500"
                                >
                                  No classes assigned.
                                </td>
                              </tr>
                            ) : (
                              assignedClasses.map((cls) => (
                                <tr key={cls.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {cls.subject}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {cls.course || cls.grade} ({cls.section})
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {cls.time || "TBD"}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {cls.room_number || "TBD"}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notices Widget */}
                  <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-sm h-full">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bell className="w-5 h-5 text-yellow-500" />
                          Notice Board
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-[400px] overflow-y-auto">
                        <NoticesBoard role="teacher" />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {currentView === "attendance" && (
              <AttendanceManager teacherId={userId} />
            )}

            {currentView === "marks" && <MarksSection teacherId={userId} />}

            {currentView === "assignments" && (
              <AssignmentsManager teacherId={userId} />
            )}

            {currentView === "performance" && (
              <StudentPerformance teacherId={userId} />
            )}

            {currentView === "notices" && <NoticesBoard role="teacher" />}

            {currentView === "profile" && (
              <TeacherProfile
                user={user}
                profile={profile}
                teacherRecord={teacherRecord}
                onChangePassword={() =>
                  alert("Password change handled in profile settings.")
                }
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

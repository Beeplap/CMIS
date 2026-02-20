"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/ui/Sidebar";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  School,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Bell,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Menu,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddUser from "@/components/ui/addUser";
import ManageCurriculum from "@/components/ui/ManageCurriculum";
import ManageBatches from "@/components/dashboard/ManageBatches";
import AssignTeacher from "@/components/dashboard/AssignTeacher";
import StudentAttendanceView from "@/components/dashboard/StudentAttendanceView";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");

  // Data States
  const [profiles, setProfiles] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notices, setNotices] = useState([]);
  const [fees, setFees] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    overallPercentage: 0,
    todayTotal: 0,
    todayPresent: 0,
    weeklyData: [],
    batchBreakdown: [],
  });

  // Modal States
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserRole, setAddUserRole] = useState("student");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");

  // --- Auth & Initial Load ---
  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      router.replace("/login");
      return;
    }

    setUserRole("admin");
    setLoading(false);
    fetchAllData();
  };

  const fetchAllData = async () => {
    // Fetch Users (Admins, Teachers)
    const { data: usersData } = await supabase.from("users").select("*");
    if (usersData) {
      setProfiles(usersData);
      setTeachers(usersData.filter((u) => u.role === "teacher"));
    }

    // Fetch Students
    const { data: studentsData } = await supabase.from("students").select("*");
    if (studentsData) setStudents(studentsData);

    // Fetch Batches
    const { data: batchesData } = await supabase
      .from("batches")
      .select("*, course:courses(code, name)")
      .eq("is_active", true);
    if (batchesData) setBatches(batchesData);

    // Fetch Notices
    const { data: noticesData } = await supabase
      .from("notices")
      .select("*")
      .order("date", { ascending: false });
    if (noticesData) setNotices(noticesData);

    // Fetch Fees
    const { data: feesData } = await supabase
      .from("fees")
      .select("*, students(full_name, class)")
      .order("created_at", { ascending: false });

    if (feesData) {
      // Transform for display if needed
      setFees(feesData);
    }

    // Fetch Attendance Statistics
    await fetchAttendanceStats();
  };

  const fetchAttendanceStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // 1. Overall attendance percentage (all time)
      const { data: allAttendance } = await supabase
        .from("attendance")
        .select("status");

      if (allAttendance && allAttendance.length > 0) {
        const total = allAttendance.length;
        const present = allAttendance.filter(
          (r) => r.status === "present",
        ).length;
        const overallPercentage =
          total > 0 ? Math.round((present / total) * 100) : 0;

        // 2. Today's attendance
        const { data: todayAttendance } = await supabase
          .from("attendance")
          .select("status, student_id")
          .eq("date", today);

        const todayUnique = new Set(
          todayAttendance?.map((r) => r.student_id) || [],
        ).size;
        const todayPresent = todayAttendance?.filter(
          (r) => r.status === "present",
        ).length || 0;

        // 3. Weekly trend (last 7 days)
        const { data: weeklyData } = await supabase
          .from("attendance")
          .select("date, status, student_id")
          .gte("date", weekAgo)
          .order("date", { ascending: true });

        const weeklyMap = {};
        weeklyData?.forEach((record) => {
          const date = record.date;
          if (!weeklyMap[date]) {
            weeklyMap[date] = { total: 0, present: 0 };
          }
          weeklyMap[date].total++;
          if (record.status === "present") {
            weeklyMap[date].present++;
          }
        });

        const weeklyTrend = Object.entries(weeklyMap)
          .map(([date, stats]) => ({
            date,
            percentage:
              stats.total > 0
                ? Math.round((stats.present / stats.total) * 100)
                : 0,
            present: stats.present,
            total: stats.total,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // 4. Batch-wise breakdown (aggregate by batch_id from students)
        const batchMap = {};
        const studentBatchMap = {};
        
        // Get student -> batch mapping
        const { data: studentBatches } = await supabase
          .from("students")
          .select("id, batch_id, batch:batches(id, academic_unit, section, course:courses(code, name))")
          .not("batch_id", "is", null);

        studentBatches?.forEach((s) => {
          if (s.batch_id && s.batch) {
            studentBatchMap[s.id] = s.batch;
          }
        });

        // Aggregate attendance by batch using weeklyData
        weeklyData?.forEach((record) => {
          const batch = studentBatchMap[record.student_id];
          if (!batch) return;
          
          const batchId = batch.id;
          if (!batchMap[batchId]) {
            batchMap[batchId] = {
              batch: batch,
              total: 0,
              present: 0,
            };
          }
          batchMap[batchId].total++;
          if (record.status === "present") {
            batchMap[batchId].present++;
          }
        });

        const batchBreakdown = Object.values(batchMap)
          .map((b) => ({
            ...b,
            percentage:
              b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5); // Top 5 batches

        setAttendanceStats({
          overallPercentage,
          todayTotal: todayUnique,
          todayPresent,
          weeklyData: weeklyTrend,
          batchBreakdown,
        });
      } else {
        setAttendanceStats({
          overallPercentage: 0,
          todayTotal: 0,
          todayPresent: 0,
          weeklyData: [],
          batchBreakdown: [],
        });
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    }
  };

  // --- Handlers ---
  const handleAddUser = (role) => {
    setAddUserRole(role);
    setShowAddUser(true);
  };

  const handleDeleteUser = async (id, role) => {
    if (!confirm("Are you sure?")) return;
    try {
      // Use existing API or direct Supabase if policy allows
      await fetch("/api/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      fetchAllData(); // Refresh
    } catch (error) {
      alert("Error deleting user");
    }
  };

  const handleAddNotice = async () => {
    const title = prompt("Enter Notice Title:");
    if (!title) return;

    const target = prompt(
      "Enter Target (All Students / Teachers):",
      "All Students",
    );

    const { error } = await supabase
      .from("notices")
      .insert([
        { title, target, date: new Date().toISOString().split("T")[0] },
      ]);

    if (error) alert("Error adding notice");
    else fetchAllData();
  };

  const handleDeleteNotice = async (id) => {
    if (!confirm("Delete this notice?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) alert("Error deleting notice");
    else fetchAllData();
  };

  // --- Render Helpers ---

  // 1. Dashboard Component
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={students.length}
          icon={School}
          color="text-blue-600"
          bg="bg-blue-100"
        />
        <StatsCard
          title="Total Teachers"
          value={teachers.length}
          icon={UserCheck}
          color="text-purple-600"
          bg="bg-purple-100"
        />
        <StatsCard
          title="Active Batches"
          value={batches.length}
          icon={LayoutDashboard}
          color="text-green-600"
          bg="bg-green-100"
        />
        <StatsCard
          title="Avg Attendance"
          value={`${attendanceStats.overallPercentage}%`}
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Attendance Summary</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAttendanceStats}
                className="text-xs"
              >
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceStats.weeklyData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-2 h-48">
                  {attendanceStats.weeklyData.map((day, idx) => (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div className="w-full flex flex-col justify-end h-40 bg-gray-100 rounded-t overflow-hidden">
                        <div
                          className={`w-full transition-all ${
                            day.percentage >= 75
                              ? "bg-green-500"
                              : day.percentage >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ height: `${day.percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 font-medium mt-1">
                        {day.percentage}%
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>
                      Today: {attendanceStats.todayPresent} /{" "}
                      {attendanceStats.todayTotal} present
                    </span>
                    <span className="font-medium text-gray-700">
                      Last 7 Days
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 border-dashed border-2 rounded-lg">
                <p className="text-gray-500">No attendance data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="font-medium text-red-700">Pending Dues</span>
              <span className="font-bold text-red-700">$12,450</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-green-700">
                Collected This Month
              </span>
              <span className="font-bold text-green-700">$45,200</span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCurrentView("fees")}
            >
              View Fee Details
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 2. Students Component
  const renderStudents = () => {
    const filtered = students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Student Management</h2>
          <Button
            onClick={() => handleAddUser("student")}
            className="bg-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search students..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 uppercase text-gray-600">
                <tr>
                  <th className="px-6 py-3">Roll</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Guardian</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{s.roll}</td>
                    <td className="px-6 py-4">{s.full_name}</td>
                    <td className="px-6 py-4">
                      {s.class} - {s.section}
                    </td>
                    <td className="px-6 py-4">{s.guardian_name}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => handleDeleteUser(s.id, "student")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Assign Class"
                        onClick={() => setShowAddClass(true)}
                      >
                        <BookOpen className="w-4 h-4 text-gray-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // 3. Teachers Component
  const renderTeachers = () => {
    const filtered = teachers.filter(
      (t) =>
        t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Teacher Management</h2>
          <Button
            onClick={() => handleAddUser("teacher")}
            className="bg-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Teacher
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search teachers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="grid gap-6">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 uppercase text-gray-600">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{t.full_name}</td>
                      <td className="px-6 py-4">{t.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {t.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => handleDeleteUser(t.id, "teacher")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center py-8 text-gray-500"
                      >
                        No teachers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // 4. Academics Management Component
  const renderAcademics = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Unit 1: Batch Management */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold border-b pb-2">Batch Management</h2>
        <ManageBatches batches={batches} onChange={fetchAllData} />
      </div>

      {/* Unit 2: Assignment Management */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold border-b pb-2">
          Teaching Assignments
        </h2>
        <AssignTeacher batches={batches} />
      </div>
    </div>
  );

  // 5. Attendance Component
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceViewMode, setAttendanceViewMode] = useState("batch"); // "batch" | "student"
  const [selectedStudentIdForAttendance, setSelectedStudentIdForAttendance] = useState("");
  const [studentAttendanceSearch, setStudentAttendanceSearch] = useState("");

  const fetchAttendance = async (batchId, date = null) => {
    if (!batchId) {
      setAttendanceRecords([]);
      return;
    }
    setLoading(true);
    try {
      // Find teaching_assignments for this batch
      const { data: teachingAssignments } = await supabase
        .from("teaching_assignments")
        .select("id")
        .eq("batch_id", batchId);

      const teachingIds = teachingAssignments?.map((ta) => ta.id) || [];

      if (teachingIds.length === 0) {
        setAttendanceRecords([]);
        setLoading(false);
        return;
      }

      // Build query - fetch all records for the batch (date filter handled on frontend)
      let query = supabase
        .from("attendance")
        .select(
          `
            *,
            students:student_id (full_name, roll),
            subject:subjects(id, name, code)
          `,
        )
        .in("class_id", teachingIds);

      // Optionally filter by date if provided (for backward compatibility)
      if (date) {
        query = query.eq("date", date);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) {
        console.error("Attendance fetch error", error);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords(data || []);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate available subjects (at component level)
  const availableSubjects = useMemo(() => {
    const subjectsMap = new Map();
    attendanceRecords.forEach((record) => {
      if (record.subject?.id) {
        subjectsMap.set(record.subject.id, {
          id: record.subject.id,
          name: record.subject.name || "Unknown",
          code: record.subject.code || "",
        });
      }
    });
    return Array.from(subjectsMap.values());
  }, [attendanceRecords]);

  // Filter attendance by subject and month (at component level)
  const filteredRecords = useMemo(() => {
    let filtered = [...attendanceRecords];

    // Filter by month
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date);
        return (
          recordDate.getFullYear() === year &&
          recordDate.getMonth() + 1 === month
        );
      });
    }

    // Filter by subject
    if (selectedSubject !== "all") {
      filtered = filtered.filter(
        (record) => record.subject?.id === selectedSubject,
      );
    }

    return filtered;
  }, [attendanceRecords, selectedSubject, selectedMonth]);

  // Calculate stats for filtered data (at component level)
  const attendanceStatsFiltered = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter(
      (r) => r.status === "present",
    ).length;
    const absent = filteredRecords.filter(
      (r) => r.status === "absent",
    ).length;
    const leave = filteredRecords.filter(
      (r) => r.status === "late",
    ).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, leave, percentage };
  }, [filteredRecords]);

  // Filtered students for individual attendance selector (search by name or roll)
  const studentsForAttendanceSelector = useMemo(() => {
    if (!studentAttendanceSearch.trim()) return students.slice(0, 100);
    const q = studentAttendanceSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.roll || "").toLowerCase().includes(q),
    );
  }, [students, studentAttendanceSearch]);

  const renderAttendance = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* View Mode Toggle: By Batch | By Student */}
        <div className="flex flex-wrap items-center gap-4">
          <Tabs
            value={attendanceViewMode}
            onValueChange={(v) => {
              setAttendanceViewMode(v);
              if (v === "batch") setSelectedStudentIdForAttendance("");
            }}
          >
            <TabsList className="h-11">
              <TabsTrigger value="batch" className="px-4">
                By Batch
              </TabsTrigger>
              <TabsTrigger value="student" className="px-4">
                By Student
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Individual Student Attendance View (same UI as student dashboard) */}
        {attendanceViewMode === "student" && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserCheck className="w-5 h-5 text-purple-600" />
                View Attendance for a Student
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or roll..."
                    className="pl-9"
                    value={studentAttendanceSearch}
                    onChange={(e) => setStudentAttendanceSearch(e.target.value)}
                  />
                </div>
                <select
                  className="min-w-[260px] p-2 border rounded-md bg-white"
                  value={selectedStudentIdForAttendance}
                  onChange={(e) => setSelectedStudentIdForAttendance(e.target.value)}
                >
                  <option value="">Select a student</option>
                  {studentsForAttendanceSelector.map((s) => {
                    const batchLabel = batches.find((b) => b.id === s.batch_id);
                    const label = batchLabel
                      ? `${batchLabel.course?.code || "?"} Sem-${batchLabel.academic_unit}`
                      : "No batch";
                    return (
                      <option key={s.id} value={s.id}>
                        {s.full_name || "Unknown"} — {s.roll || "-"} ({label})
                      </option>
                    );
                  })}
                </select>
                {selectedStudentIdForAttendance && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStudentIdForAttendance("");
                      setStudentAttendanceSearch("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {selectedStudentIdForAttendance ? (
                <div className="rounded-lg border bg-gray-50/50 p-4">
                  <StudentAttendanceView studentId={selectedStudentIdForAttendance} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg bg-gray-50/50">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a student to view their attendance (same view as student dashboard).</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* By Batch: Overview Stats (only when in batch mode) */}
        {attendanceViewMode === "batch" && (
          <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-purple-700 mb-1">
                Overall Attendance
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {attendanceStats.overallPercentage}%
              </p>
              {attendanceStats.overallPercentage > 0 && attendanceStats.overallPercentage < 75 && (
                <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Below 75%
                </span>
              )}
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Today Total
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {attendanceStats.todayTotal}
              </p>
              <p className="text-xs text-gray-400 mt-1">Marked today</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-green-600 mb-1">
                Today Present
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {attendanceStats.todayPresent}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Absent: {attendanceStats.todayTotal - attendanceStats.todayPresent}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Batch Breakdown */}
        {attendanceStats.batchBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Batches by Attendance (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceStats.batchBreakdown.map((batch, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {batch.batch?.course?.code || "Unknown"} Sem-
                        {batch.batch?.academic_unit || "N/A"}
                        {batch.batch?.section
                          ? ` (${batch.batch.section})`
                          : ""}
                      </span>
                      <span className="font-bold text-gray-900">
                        {batch.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          batch.percentage >= 75
                            ? "bg-green-500"
                            : batch.percentage >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${batch.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {batch.present} present / {batch.total} total
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed View with Subject Tabs */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="w-5 h-5 text-purple-600" />
                Attendance Records
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="month-filter-admin"
                    className="text-sm font-medium text-gray-700 whitespace-nowrap"
                  >
                    Filter by Month:
                  </label>
                  <input
                    id="month-filter-admin"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedAttendanceClass) {
                      fetchAttendance(selectedAttendanceClass);
                    }
                  }}
                  className="whitespace-nowrap"
                  disabled={!selectedAttendanceClass}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Batch Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Batch
              </label>
              <select
                className="w-full sm:w-auto min-w-[250px] p-2 border rounded-md"
                value={selectedAttendanceClass}
                onChange={(e) => {
                  setSelectedAttendanceClass(e.target.value);
                  setSelectedSubject("all"); // Reset subject when batch changes
                  if (e.target.value) {
                    // Fetch all records for the batch (no date filter)
                    fetchAttendance(e.target.value);
                  }
                }}
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.course?.code || "Unknown"} Sem-{b.academic_unit}{" "}
                    {b.section ? `(${b.section})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Tabs */}
            {availableSubjects.length > 0 && selectedAttendanceClass && (
              <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
                <div className="mb-6">
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="all">All Subjects</TabsTrigger>
                    {availableSubjects.map((subject) => (
                      <TabsTrigger key={subject.id} value={subject.id}>
                        {subject.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Per-Subject Stats (shown when a specific subject is selected) */}
                {selectedSubject !== "all" && (
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <p className="text-xs font-medium text-blue-600 mb-1">
                        Total Classes
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceStatsFiltered.total}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <p className="text-xs font-medium text-green-600 mb-1">
                        Present
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceStatsFiltered.present}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <p className="text-xs font-medium text-red-600 mb-1">
                        Absent
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceStatsFiltered.absent}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                      <p className="text-xs font-medium text-yellow-600 mb-1">
                        On Leave
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceStatsFiltered.leave}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <p className="text-xs font-medium text-purple-600 mb-1">
                        Percentage
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceStatsFiltered.percentage}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary Stats Bar */}
                {filteredRecords.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <span className="font-medium text-gray-700">
                      <span className="text-green-600">Present:</span> {attendanceStatsFiltered.present}
                    </span>
                    <span className="font-medium text-gray-700">
                      <span className="text-red-600">Absent:</span> {attendanceStatsFiltered.absent}
                    </span>
                    <span className="font-medium text-gray-700">
                      <span className="text-yellow-600">On Leave:</span> {attendanceStatsFiltered.leave}
                    </span>
                    <span className="font-medium text-gray-700">
                      <span className="text-purple-600">Total:</span> {attendanceStatsFiltered.total}
                    </span>
                    {attendanceStatsFiltered.total > 0 && (
                      <span className="ml-auto font-bold text-purple-600">
                        {attendanceStatsFiltered.percentage}% Attendance
                      </span>
                    )}
                  </div>
                )}

                {/* All Subjects Tab Content */}
                <TabsContent value="all" className="mt-0">
                  <AttendanceTable records={filteredRecords} />
                </TabsContent>

                {/* Individual Subject Tab Content */}
                {availableSubjects.map((subject) => (
                  <TabsContent key={subject.id} value={subject.id} className="mt-0">
                    <AttendanceTable records={filteredRecords} />
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* No subjects available or no batch selected */}
            {(!selectedAttendanceClass || availableSubjects.length === 0) && (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg bg-gray-50">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {!selectedAttendanceClass
                    ? "Select a batch to view attendance records"
                    : "No attendance records found for the selected filters."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </div>
    );
  };

  // Separate component for attendance table
  const AttendanceTable = ({ records }) => {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Roll
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Student
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Subject
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length > 0 ? (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(record.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString(undefined, {
                            weekday: "short",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-600">
                      {record.students?.roll || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {record.students?.full_name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {record.subject?.name || "-"}
                      </span>
                      {record.subject?.code && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({record.subject.code})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          record.status === "present"
                            ? "bg-green-100 text-green-700"
                            : record.status === "absent"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {record.status === "late" ? "on leave" : record.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="w-8 h-8 opacity-30" />
                      <p className="text-sm">
                        No attendance records found for the selected filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 6. Fees Component
  const renderFees = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold">Fee Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-green-600">Collected</p>
            <p className="text-2xl font-bold text-green-800">$45,200</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-600">Pending</p>
            <p className="text-2xl font-bold text-red-800">$12,450</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 uppercase text-gray-600">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Amount Due</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-b">
                  <td className="px-6 py-4 font-medium">
                    {fee.students?.full_name || "Unknown"}
                  </td>
                  <td className="px-6 py-4">{fee.students?.class || "N/A"}</td>
                  <td className="px-6 py-4">${fee.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        fee.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : fee.status === "Overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="outline">
                      Remind
                    </Button>
                  </td>
                </tr>
              ))}
              {fees.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No fee records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // 7. Reports Component
  const renderReports = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold">Reports & Exports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Monthly attendance summary for all classes.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Academic performance and grades export.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 8. Notices Component
  const renderNotices = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Notices & Announcements</h2>
        <Button className="bg-purple-600" onClick={handleAddNotice}>
          <Plus className="w-4 h-4 mr-2" /> Create Notice
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {notices.map((n) => (
            <div
              key={n.id}
              className="p-4 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center"
            >
              <div>
                <h4 className="font-semibold text-gray-900">{n.title}</h4>
                <p className="text-sm text-gray-500">
                  Target: {n.target} • {n.date}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteNotice(n.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  // --- Main Render ---
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="admin"
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentView={currentView}
        onViewChange={setCurrentView}
        onAddStudent={() => {
          setAddUserRole("student");
          setShowAddUser(true);
        }}
        onAddTeacher={() => {
          setAddUserRole("teacher");
          setShowAddUser(true);
        }}
        onAssignClass={() => {
          setCurrentView("subjects");
        }}
      />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
        {/* Header Mobile Toggle */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-purple-700">Admin Panel</h1>
          <Button variant="ghost" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {/* Content Switcher */}
        {currentView === "dashboard" && renderDashboard()}
        {currentView === "students" && renderStudents()}
        {currentView === "teachers" && renderTeachers()}
        {currentView === "subjects" && renderAcademics()}
        {currentView === "curriculum" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold border-b pb-4 mb-6">
              Curriculum Management
            </h2>
            <ManageCurriculum />
          </div>
        )}
        {/* Note: Sidebar uses 'subjects' ID for Class & Subject Management */}
        {currentView === "attendance" && renderAttendance()}
        {currentView === "fees" && renderFees()}
        {currentView === "reports" && renderReports()}
        {currentView === "notices" && renderNotices()}
      </main>

      {/* Modals */}
      {/* Modals */}
      {/* Modals */}
      <AddUser
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        onUserAdded={fetchAllData}
        userType={addUserRole}
      />
    </div>
  );
}

// Simple Stat Card Component
function StatsCard({ title, value, icon: Icon, color, bg }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

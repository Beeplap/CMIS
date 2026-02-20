"use client";
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calendar,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

export default function StudentAttendanceView({ studentId }) {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (studentId) fetchAttendance();
  }, [studentId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          `
          id,
          date,
          status,
          subject:subjects(id, name, code)
        `,
        )
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (!error && data) {
        setAttendance(data);
      }
    } catch (err) {
      console.error("Error fetching student attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique subjects from attendance data
  const availableSubjects = useMemo(() => {
    const subjectsMap = new Map();
    attendance.forEach((record) => {
      if (record.subject?.id) {
        subjectsMap.set(record.subject.id, {
          id: record.subject.id,
          name: record.subject.name || "Unknown",
          code: record.subject.code || "",
        });
      }
    });
    return Array.from(subjectsMap.values());
  }, [attendance]);

  // Filter attendance based on selected subject and month
  const filteredAttendance = useMemo(() => {
    let filtered = [...attendance];

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
  }, [attendance, selectedSubject, selectedMonth]);

  // Calculate stats for filtered data
  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(
      (r) => r.status === "present",
    ).length;
    const absent = filteredAttendance.filter(
      (r) => r.status === "absent",
    ).length;
    const leave = filteredAttendance.filter(
      (r) => r.status === "late",
    ).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      absent,
      leave,
      percentage,
    };
  }, [filteredAttendance]);

  // Overall stats (all time, all subjects)
  const overallStats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((r) => r.status === "present").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percentage };
  }, [attendance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-purple-700 mb-1">
              Overall Attendance
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {overallStats.percentage}%
            </p>
            {overallStats.percentage < 75 && (
              <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3 mr-1" /> Low Attendance
              </span>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Total Classes
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {overallStats.total}
            </p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-green-600 mb-1">
              Classes Present
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {overallStats.present}
            </p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Attendance Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="w-5 h-5 text-purple-600" />
              Attendance History
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Month Filter */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="month-filter"
                  className="text-sm font-medium text-gray-700 whitespace-nowrap"
                >
                  Filter by Month:
                </label>
                <input
                  id="month-filter"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAttendance}
                className="whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Subject Tabs */}
          {availableSubjects.length > 0 && (
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
                      {stats.total}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p className="text-xs font-medium text-green-600 mb-1">
                      Present
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.present}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <p className="text-xs font-medium text-red-600 mb-1">
                      Absent
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.absent}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                    <p className="text-xs font-medium text-yellow-600 mb-1">
                      On Leave
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.leave}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <p className="text-xs font-medium text-purple-600 mb-1">
                      Percentage
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.percentage}%
                    </p>
                  </div>
                </div>
              )}

              {/* All Subjects Tab Content */}
              <TabsContent value="all" className="mt-0">
                <AttendanceTable
                  attendance={filteredAttendance}
                  stats={stats}
                />
              </TabsContent>

              {/* Individual Subject Tab Content */}
              {availableSubjects.map((subject) => (
                <TabsContent key={subject.id} value={subject.id} className="mt-0">
                  <AttendanceTable
                    attendance={filteredAttendance}
                    stats={stats}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* No subjects available */}
          {availableSubjects.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No attendance records found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Separate component for attendance table to keep code clean
function AttendanceTable({ attendance, stats }) {
  return (
    <div className="space-y-4">
      {/* Summary Stats Bar (shown for "All Subjects" tab) */}
      {attendance.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm">
          <span className="font-medium text-gray-700">
            <span className="text-green-600">Present:</span> {stats.present}
          </span>
          <span className="font-medium text-gray-700">
            <span className="text-red-600">Absent:</span> {stats.absent}
          </span>
          <span className="font-medium text-gray-700">
            <span className="text-yellow-600">On Leave:</span> {stats.leave}
          </span>
          <span className="font-medium text-gray-700">
            <span className="text-purple-600">Total:</span> {stats.total}
          </span>
          {stats.total > 0 && (
            <span className="ml-auto font-bold text-purple-600">
              {stats.percentage}% Attendance
            </span>
          )}
        </div>
      )}

      {/* Attendance Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Date
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
              {attendance.length > 0 ? (
                attendance.map((record) => (
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
                    colSpan="3"
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
    </div>
  );
}

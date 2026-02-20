"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, UserCheck, AlertTriangle } from "lucide-react";

export default function StudentAttendanceView({ studentId }) {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    leave: 0,
    percentage: 0,
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
          subject:subjects(name, code)
        `,
        )
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (!error && data) {
        setAttendance(data);

        const total = data.length;
        const present = data.filter((r) => r.status === "present").length;
        const absent = data.filter((r) => r.status === "absent").length;
        const leave = data.filter((r) => r.status === "late").length; // stored as 'late' in DB, treated as leave in UI

        const percentage =
          total > 0 ? Math.round((present / total) * 100) : 0;

        setStats({
          total,
          present,
          absent,
          leave,
          percentage,
        });
      }
    } catch (err) {
      console.error("Error fetching student attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-purple-600">
              Overall Attendance
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {stats.percentage}%
            </p>
            {stats.percentage < 75 && (
                <span className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Low Attendance
                </span>
            )}
          </CardContent>
        </Card>
        <Card>
           <CardContent className="p-6 flex flex-col items-center justify-center">
             <p className="text-sm font-medium text-gray-500">
               Total Classes
             </p>
             <p className="text-3xl font-bold text-gray-900 mt-2">
               {stats.total}
             </p>
           </CardContent>
        </Card>
        <Card>
           <CardContent className="p-6 flex flex-col items-center justify-center">
             <p className="text-sm font-medium text-green-600">
               Classes Present
             </p>
             <p className="text-3xl font-bold text-gray-900 mt-2">
               {stats.present}
             </p>
           </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-green-600">
                  Present: {stats.present}
                </span>
                {" • "}
                <span className="font-medium text-red-600">
                  Absent: {stats.absent}
                </span>
                {" • "}
                <span className="font-medium text-yellow-600">
                  On Leave: {stats.leave}
                </span>
              </div>
              <button
                onClick={fetchAttendance}
                className="text-xs text-purple-600 hover:text-purple-800 underline"
              >
                Refresh
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(record.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {record.subject?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-bold uppercase ${
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
                ))}
                {attendance.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="p-6 text-center text-gray-500"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

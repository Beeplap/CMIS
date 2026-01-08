"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, FileText, Calendar } from "lucide-react";

export default function NoticesBoard({ role = "teacher" }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
        // Optional: filter by audience (e.g. 'all', 'teachers')

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Loading notices...</div>;

  return (
    <div className="grid grid-cols-1 gap-4">
      {notices.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <p>No notices at the moment.</p>
        </Card>
      ) : (
        notices.map((notice) => (
          <Card key={notice.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase">
                      {notice.type || "General"}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{notice.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {notice.content}
                  </p>
                </div>
                {/* Optional: Attachment Icon if notice has file */}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

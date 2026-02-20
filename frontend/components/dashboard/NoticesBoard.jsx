"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, Calendar, Pin, Download } from "lucide-react";

export default function NoticesBoard({ role = "teacher", userId, limit = 5 }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId]);

  const fetchNotices = async () => {
    try {
      const res = await fetch(`/api/notices?user_id=${userId}&role=${role}`);
      const data = await res.json();
      const list = Array.isArray(data?.notices) ? data.notices : [];
      setNotices(list.slice(0, limit));
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;
  if (loading)
    return (
      <div className="p-4 text-center text-gray-500">Loading notices...</div>
    );

  return (
    <div className="grid grid-cols-1 gap-3">
      {notices.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">
          No notices at the moment.
        </div>
      ) : (
        notices.map((notice) => (
          <Card
            key={notice.id}
            className={`hover:shadow-md transition-shadow ${
              notice.is_pinned ? "border-purple-200 bg-purple-50/30" : ""
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {notice.is_pinned && (
                      <Pin className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                    <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                      {notice.title}
                    </CardTitle>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(notice.created_at).toLocaleDateString()}
                  </div>
                </div>

                {notice.attachment_url && (
                  <a
                    href={notice.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1 shrink-0"
                    title="Download attachment"
                  >
                    <Download className="w-3 h-3" />
                    File
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 line-clamp-2">
                {notice.message}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

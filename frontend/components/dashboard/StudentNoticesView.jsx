"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  Download,
  Pin,
  CheckCircle,
  Circle,
  RefreshCw,
} from "lucide-react";

export default function StudentNoticesView({ studentId, notices: noticesProp, loading: loadingProp, onRefresh, onMarkAsRead: onMarkAsReadCallback }) {
  const [internalNotices, setInternalNotices] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isControlled = noticesProp !== undefined;
  const notices = isControlled ? noticesProp : internalNotices;
  const loading = isControlled ? (loadingProp ?? false) : internalLoading;

  useEffect(() => {
    if (isControlled) return;
    if (studentId) {
      fetchNotices();
    } else {
      setInternalLoading(false);
    }
  }, [studentId, isControlled]);

  const fetchNotices = async () => {
    if (!studentId) return;
    if (isControlled && onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
      return;
    }
    if (isControlled) return;
    setInternalLoading(true);
    try {
      const res = await fetch(`/api/notices?user_id=${studentId}&role=student&student_id=${studentId}`);
      const data = await res.json();
      if (data.notices) setInternalNotices(data.notices);
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setInternalLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isControlled && onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    } else {
      setRefreshing(true);
      await fetchNotices();
      setRefreshing(false);
    }
  };

  const markAsRead = async (noticeId) => {
    try {
      const res = await fetch(`/api/notices/${noticeId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: studentId }),
      });

      if (res.ok) {
        if (isControlled && onMarkAsReadCallback) {
          onMarkAsReadCallback(noticeId);
        } else if (!isControlled) {
          setInternalNotices((prev) =>
            prev.map((notice) =>
              notice.id === noticeId ? { ...notice, is_read: true } : notice
            )
          );
        }
      }
    } catch (error) {
      console.error("Error marking notice as read:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Separate pinned and regular notices
  const pinnedNotices = notices.filter((n) => n.is_pinned);
  const regularNotices = notices.filter((n) => !n.is_pinned);
  const unreadCount = notices.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-600" />
            Notices & Announcements
          </h2>
          {unreadCount > 0 && (
            <p className="text-sm text-purple-600 mt-1">
              {unreadCount} unread notice{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh notices"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Pinned Notices */}
      {pinnedNotices.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Pin className="w-5 h-5 text-purple-600" />
            Pinned Notices
          </h3>
          {pinnedNotices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              onMarkAsRead={markAsRead}
            />
          ))}
        </div>
      )}

      {/* Regular Notices */}
      <div className="space-y-4">
        {pinnedNotices.length > 0 && (
          <h3 className="text-lg font-semibold text-gray-700">All Notices</h3>
        )}
        {regularNotices.map((notice) => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            onMarkAsRead={markAsRead}
          />
        ))}
      </div>

      {notices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notices available at this time.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Notice Card Component
function NoticeCard({ notice, onMarkAsRead }) {
  const [isRead, setIsRead] = useState(notice.is_read || false);

  const handleMarkAsRead = () => {
    if (!isRead) {
      setIsRead(true);
      onMarkAsRead(notice.id);
    }
  };

  return (
    <Card
      className={`hover:shadow-md transition ${
        notice.is_pinned ? "border-purple-300 bg-purple-50/30" : ""
      } ${!isRead ? "border-l-4 border-l-blue-500" : ""}`}
      onClick={handleMarkAsRead}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start w-full gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {notice.is_pinned && (
                <Pin className="w-4 h-4 text-purple-600 shrink-0" />
              )}
              {!isRead && (
                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
              )}
              <CardTitle className="text-lg font-semibold text-gray-900">
                {notice.title}
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(notice.created_at).toLocaleDateString()}
              </span>
              {notice.expires_at && (
                <span className="text-orange-600">
                  Expires: {new Date(notice.expires_at).toLocaleDateString()}
                </span>
              )}
              {notice.created_by_user && (
                <span>By: {notice.created_by_user.full_name}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 ml-auto self-center">
            {isRead ? (
              <CheckCircle className="w-5 h-5 text-green-600" title="Read" />
            ) : (
              <Circle className="w-5 h-5 text-blue-500" title="Unread" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 whitespace-pre-wrap mb-3">
          {notice.message}
        </p>
        {notice.attachment_url && (
          <a
            href={notice.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
          >
            <Download className="w-4 h-4" />
            Download Attachment
          </a>
        )}
      </CardContent>
    </Card>
  );
}


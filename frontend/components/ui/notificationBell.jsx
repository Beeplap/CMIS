"use client";
import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { Bell, Send, X, Clock } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import NotificationPanel from "./notificationPanel";
import { Button } from "./button";

export default function NotificationBell({ userRole, userId }) {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

useEffect(() => {
    if (!userRole) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userRole}-${userId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          // Check if notification is for this user's role
          const newNotification = payload.new;
          if (
            newNotification.recipient_role === "all" ||
            newNotification.recipient_role === userRole ||
            (userId && newNotification.recipient_user_id === userId)
          ) {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userRole, userId]);

  const fetchNotifications = async () => {
    if (!userRole) return;

    try {
      setLoading(true);

      const filters = [
        `recipient_role.eq.${userRole}`,
        "recipient_role.eq.all",
      ];

      if (userId) {
        filters.push(`recipient_user_id.eq.${userId}`);
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(filters.join(","))
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        // If table doesn't exist, just log and continue
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.warn("Notifications table not found. Please run the migration SQL.");
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw error;
      }
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error("Please sign in again to delete notifications.");
        return;
      }

      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to delete notification");
        return;
      }

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          className="p-2 rounded-full relative"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {userRole === "admin" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowNotificationPanel(true);
                    }}
                    className="text-xs"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Loading...
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(notification.created_at)}</span>
                            <span className="mx-1">•</span>
                            <span>
                              {new Date(notification.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          aria-label="Delete notification"
                        >
                          <X className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={fetchNotifications}
                  className="w-full text-xs text-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 py-1"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Panel for Admin */}
      {userRole === "admin" && (
        <NotificationPanel
          open={showNotificationPanel}
          onClose={() => setShowNotificationPanel(false)}
          onNotificationSent={() => {
            fetchNotifications();
          }}
        />
      )}
    </>
  );
}


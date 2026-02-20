"use client";
import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "./button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./card";
import { Bell, Send, X } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function NotificationPanel({ open, onClose, onNotificationSent }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientRole, setRecipientRole] = useState("teacher");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Please fill in both title and message");
      return;
    }

    setSending(true);
    setError("");

    try {
      // Get current user for sender_id
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("You must be logged in to send notifications");
        setSending(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          recipient_role: recipientRole,
          recipient_user_id: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.needsMigration) {
          setError(
            `Database migration required. Please run the SQL migration: ${result.sql || "See frontend/migrations/create_notifications_table.sql"}`
          );
        } else {
          setError(result.error || "Failed to send notification");
        }
        setSending(false);
        return;
      }

      // Success - reset form and close
      setTitle("");
      setMessage("");
      setRecipientRole("teacher");
      setError("");
      
      if (onNotificationSent) {
        onNotificationSent();
      }
      
      onClose();
      toast.success("Notification sent successfully!");
    } catch (err) {
      console.error("Error sending notification:", err);
      setError(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setTitle("");
      setMessage("");
      setRecipientRole("teacher");
      setError("");
      onClose();
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">
                        Send Notification
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Send a notification to all teachers
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={sending}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </CardHeader>

                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient
                    </label>
                    <select
                      value={recipientRole}
                      onChange={(e) => setRecipientRole(e.target.value)}
                      disabled={sending}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value="teacher">All Teachers</option>
                      <option value="student">All Students</option>
                      <option value="all">All Users</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={sending}
                      placeholder="Enter notification title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      maxLength={255}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {title.length}/255 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={sending}
                      placeholder="Enter notification message"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {message.length} characters
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={sending}
                      className="border-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={sending || !title.trim() || !message.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {sending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Notification
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}



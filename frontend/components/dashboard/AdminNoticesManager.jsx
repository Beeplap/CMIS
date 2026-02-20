"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Download,
  Eye,
  Calendar,
  Users,
  X,
  CheckCircle,
} from "lucide-react";

export default function AdminNoticesManager({ userId }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedNoticeReads, setSelectedNoticeReads] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    attachment_url: "",
    target_type: "all",
    target_value: "",
    is_pinned: false,
    expires_at: "",
  });

  useEffect(() => {
    if (userId) {
      fetchNotices();
      fetchBatchesAndCourses();
    }
  }, [userId]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notices?user_id=${userId}&role=admin`);
      const data = await res.json();
      if (data.notices) {
        setNotices(data.notices);
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchesAndCourses = async () => {
    const { data: batchesData } = await supabase
      .from("batches")
      .select("*, course:courses(id, code, name)")
      .eq("is_active", true);
    setBatches(batchesData || []);

    const { data: coursesData } = await supabase.from("courses").select("*");
    setCourses(coursesData || []);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          created_by: userId,
          expires_at: formData.expires_at || null,
        }),
      });

      if (res.ok) {
        await fetchNotices();
        resetForm();
        setShowCreateModal(false);
        alert("Notice created successfully!");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create notice");
      }
    } catch (error) {
      console.error("Error creating notice:", error);
      alert("Failed to create notice");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/notices/${editingNotice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          user_id: userId,
        }),
      });

      if (res.ok) {
        await fetchNotices();
        resetForm();
        setEditingNotice(null);
        alert("Notice updated successfully!");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update notice");
      }
    } catch (error) {
      console.error("Error updating notice:", error);
      alert("Failed to update notice");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const res = await fetch(`/api/notices/${id}?user_id=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchNotices();
        alert("Notice deleted successfully!");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete notice");
      }
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert("Failed to delete notice");
    }
  };

  const handleTogglePin = async (notice) => {
    try {
      const res = await fetch(`/api/notices/${notice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_pinned: !notice.is_pinned,
          user_id: userId,
        }),
      });

      if (res.ok) {
        await fetchNotices();
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const fetchReadStatus = async (noticeId) => {
    try {
      const res = await fetch(`/api/notices/${noticeId}?user_id=${userId}`);
      const data = await res.json();
      if (data.notice?.reads) {
        setSelectedNoticeReads(data.notice.reads);
      }
    } catch (error) {
      console.error("Error fetching read status:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      attachment_url: "",
      target_type: "all",
      target_value: "",
      is_pinned: false,
      expires_at: "",
    });
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      message: notice.message,
      attachment_url: notice.attachment_url || "",
      target_type: notice.target_type,
      target_value: notice.target_value || "",
      is_pinned: notice.is_pinned,
      expires_at: notice.expires_at
        ? new Date(notice.expires_at).toISOString().slice(0, 16)
        : "",
    });
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-600" />
            Notice Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage notices for all users
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingNotice(null);
            setShowCreateModal(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Notice
        </Button>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {notices.map((notice) => (
          <Card
            key={notice.id}
            className={`${notice.is_pinned ? "border-purple-300 bg-purple-50/30" : ""} ${notice.expires_at && new Date(notice.expires_at) < new Date() ? "opacity-60" : ""}`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {notice.is_pinned && (
                      <Pin className="w-4 h-4 text-purple-600" />
                    )}
                    <CardTitle className="text-lg">{notice.title}</CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {notice.target_type}
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
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePin(notice)}
                    title={notice.is_pinned ? "Unpin" : "Pin"}
                  >
                    {notice.is_pinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchReadStatus(notice.id)}
                    title="View Read Status"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(notice)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notice.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                  className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Download Attachment
                </a>
              )}
            </CardContent>
          </Card>
        ))}

        {notices.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notices created yet. Create your first notice!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingNotice ? "Edit Notice" : "Create New Notice"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                    setEditingNotice(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={editingNotice ? handleUpdate : handleCreate}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded-md"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    className="w-full p-2 border rounded-md"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Target Audience *
                  </label>
                  <select
                    required
                    className="w-full p-2 border rounded-md"
                    value={formData.target_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_type: e.target.value,
                        target_value: "",
                      })
                    }
                  >
                    <option value="all">All Users</option>
                    <option value="students">All Students</option>
                    <option value="teachers">All Teachers</option>
                    <option value="semester">Specific Semester</option>
                    <option value="course">Specific Course</option>
                    <option value="batch">Specific Batch</option>
                  </select>
                </div>

                {formData.target_type === "semester" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Semester Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      required
                      className="w-full p-2 border rounded-md"
                      value={formData.target_value}
                      onChange={(e) =>
                        setFormData({ ...formData, target_value: e.target.value })
                      }
                      placeholder="e.g., 5"
                    />
                  </div>
                )}

                {formData.target_type === "course" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Select Course
                    </label>
                    <select
                      required
                      className="w-full p-2 border rounded-md"
                      value={formData.target_value}
                      onChange={(e) =>
                        setFormData({ ...formData, target_value: e.target.value })
                      }
                    >
                      <option value="">Select Course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.target_type === "batch" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Select Batch
                    </label>
                    <select
                      required
                      className="w-full p-2 border rounded-md"
                      value={formData.target_value}
                      onChange={(e) =>
                        setFormData({ ...formData, target_value: e.target.value })
                      }
                    >
                      <option value="">Select Batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.course?.code} Sem-{batch.academic_unit}
                          {batch.section ? ` (${batch.section})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Attachment URL (optional)
                  </label>
                  <input
                    type="url"
                    className="w-full p-2 border rounded-md"
                    value={formData.attachment_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attachment_url: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) =>
                        setFormData({ ...formData, is_pinned: e.target.checked })
                      }
                    />
                    <span className="text-sm">Pin this notice</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full p-2 border rounded-md"
                    value={formData.expires_at}
                    onChange={(e) =>
                      setFormData({ ...formData, expires_at: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                      setEditingNotice(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    {editingNotice ? "Update Notice" : "Create Notice"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Read Status Modal */}
      {selectedNoticeReads && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Notice Read Status</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNoticeReads(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedNoticeReads.map((read) => (
                  <div
                    key={read.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium">{read.user?.full_name}</p>
                      <p className="text-sm text-gray-500">{read.user?.email}</p>
                      <p className="text-xs text-gray-400">
                        Read at: {new Date(read.read_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {read.user?.role}
                    </span>
                  </div>
                ))}
                {selectedNoticeReads.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No one has read this notice yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

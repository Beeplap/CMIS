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
  Download,
  Calendar,
  X,
} from "lucide-react";

export default function TeacherNoticesManager({ teacherId }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [teachingAssignments, setTeachingAssignments] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    attachment_url: "",
    target_type: "batch",
    target_value: "",
    expires_at: "",
  });

  useEffect(() => {
    if (teacherId) {
      fetchNotices();
      fetchTeachingAssignments();
    }
  }, [teacherId]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notices?user_id=${teacherId}&role=teacher`);
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

  const fetchTeachingAssignments = async () => {
    const { data } = await supabase
      .from("teaching_assignments")
      .select(
        `
        id,
        batch:batches(id, academic_unit, section, course:courses(code, name)),
        subject:subjects(name)
      `
      )
      .eq("teacher_id", teacherId);

    setTeachingAssignments(data || []);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          created_by: teacherId,
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
          user_id: teacherId,
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
      const res = await fetch(`/api/notices/${id}?user_id=${teacherId}`, {
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

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      attachment_url: "",
      target_type: "batch",
      target_value: "",
      expires_at: "",
    });
  };

  const openEditModal = (notice) => {
    // Only allow editing own notices
    if (notice.created_by !== teacherId) {
      alert("You can only edit your own notices");
      return;
    }
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      message: notice.message,
      attachment_url: notice.attachment_url || "",
      target_type: notice.target_type,
      target_value: notice.target_value || "",
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
            Notices & Announcements
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create notices for your assigned batches
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
        {notices.map((notice) => {
          const isOwnNotice = notice.created_by === teacherId;
          return (
            <Card key={notice.id} className={notice.is_pinned ? "border-purple-300 bg-purple-50/30" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notice.is_pinned && (
                        <span className="text-purple-600 text-xs font-bold">PINNED</span>
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
                    </div>
                  </div>
                  {isOwnNotice && (
                    <div className="flex gap-2">
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
                  )}
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
          );
        })}

        {notices.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notices available. Create your first notice!</p>
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
                    Target Batch *
                  </label>
                  <select
                    required
                    className="w-full p-2 border rounded-md"
                    value={formData.target_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_value: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Batch</option>
                    {teachingAssignments.map((ta) => (
                      <option key={ta.batch.id} value={ta.batch.id}>
                        {ta.batch.course?.code} Sem-{ta.batch.academic_unit}
                        {ta.batch.section ? ` (${ta.batch.section})` : ""} - {ta.subject?.name}
                      </option>
                    ))}
                  </select>
                </div>

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
    </div>
  );
}

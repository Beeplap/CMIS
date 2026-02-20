"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";

/**
 * Unified Directory component for displaying teachers or students
 * @param {string} type - "teacher" or "student"
 * @param {string} title - Page title
 * @param {string} description - Page description
 */
export default function Directory({ type = "teacher", title, description }) {
  const toast = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const isTeacher = type === "teacher";
  const tableName = isTeacher ? "users" : "students";
  const filterField = isTeacher ? "role" : "class";

  useEffect(() => {
    fetchItems();
  }, [classFilter, sectionFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      let query = supabase.from(tableName).select("*");

      if (isTeacher) {
        query = query.eq("role", "teacher");
      } else {
        if (classFilter) {
          query = query.eq("class", classFilter);
        }
        if (sectionFilter) {
          query = query.eq("section", sectionFilter);
        }
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      let filtered = data || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((item) => {
          if (isTeacher) {
            return (
              item.full_name?.toLowerCase().includes(searchLower) ||
              item.email?.toLowerCase().includes(searchLower)
            );
          } else {
            return (
              item.full_name?.toLowerCase().includes(searchLower) ||
              item.roll?.toLowerCase().includes(searchLower) ||
              item.guardian_name?.toLowerCase().includes(searchLower)
            );
          }
        });
      }

      setItems(filtered);
    } catch (error) {
      console.error(`Error fetching ${type}s:`, error);
      toast.error(`Failed to load ${type}s`);
    } finally {
      setLoading(false);
    }
  };

  // Get unique classes and sections for filters (students only)
  const uniqueClasses = isTeacher
    ? []
    : Array.from(new Set(items.map((s) => s.class).filter(Boolean))).sort();
  const uniqueSections = isTeacher
    ? []
    : Array.from(new Set(items.map((s) => s.section).filter(Boolean))).sort();

  const handleDeleteClick = (id) => setDeleteConfirm({ open: true, id });

  const handleDeleteConfirm = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: null });
    if (!id) return;
    try {
      const response = await fetch("/api/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: type }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Unknown error");
        return;
      }
      fetchItems();
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(error.message);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {title || `${type.charAt(0).toUpperCase() + type.slice(1)}s`}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {description || `Manage ${type} accounts and information`}
            </p>
          </div>

          {/* Search and Filters */}
          {!isTeacher && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, roll, or guardian..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class
                  </label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Section
                  </label>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {`${type.charAt(0).toUpperCase() + type.slice(1)} List`} ({items.length})
              </h2>
              {!isTeacher && (
                <Button
                  onClick={() => alert("Add student feature - coming soon!")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Add Student
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading {type}s...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No {type}s found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {!isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profile
                        </th>
                      )}
                      {!isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Roll
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Name
                      </th>
                      {!isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Class
                        </th>
                      )}
                      {!isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Section
                        </th>
                      )}
                      {isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Email
                        </th>
                      )}
                      {isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Role
                        </th>
                      )}
                      {!isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Guardian
                        </th>
                      )}
                      {isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Joined
                        </th>
                      )}
                      {!isTeacher && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        {!isTeacher && (
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                              {item.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2) || "?"}
                            </div>
                          </td>
                        )}
                        {!isTeacher && (
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.roll}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {item.full_name || "N/A"}
                        </td>
                        {!isTeacher && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {item.class || "-"}
                          </td>
                        )}
                        {!isTeacher && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {item.section || "-"}
                          </td>
                        )}
                        {isTeacher && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {item.email}
                          </td>
                        )}
                        {isTeacher && (
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium text-white bg-blue-500 dark:bg-blue-600">
                              {item.role}
                            </span>
                          </td>
                        )}
                        {!isTeacher && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {item.guardian_name || "-"}
                          </td>
                        )}
                        {isTeacher && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                        )}
                        {!isTeacher && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => alert(`Edit ${item.full_name}`)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


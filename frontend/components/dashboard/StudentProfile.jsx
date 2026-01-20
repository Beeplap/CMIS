"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut, Key } from "lucide-react";

export default function StudentProfile({ studentData, user }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: studentData?.phone_number || "",
    address: studentData?.address || "",
    guardian_contact: studentData?.guardian_contact || "",
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          phone_number: formData.phone_number,
          address: formData.address,
          guardian_contact: formData.guardian_contact,
        })
        .eq("id", user.id);

      if (error) throw error;
      alert("Profile updated successfully!");
      setIsEditing(false);
      window.location.reload(); // Simple reload to refresh data
    } catch (error) {
      alert("Error updating profile: " + error.message);
    }
  };

  const batchInfo = studentData?.batch
    ? `${studentData.batch.course?.code} ${studentData.batch.academic_unit} (${studentData.batch.section})`
    : "No Batch Assigned";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Profile</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center p-6 bg-purple-50 rounded-lg">
            <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              {studentData?.full_name?.charAt(0) || "S"}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {studentData?.full_name}
            </h2>
            <p className="text-gray-500">{user?.email}</p>
            <p className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2">
              Roll: {studentData?.roll || "N/A"} | Batch: {batchInfo}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex justify-between p-3 border rounded hover:bg-gray-50 items-center">
              <span className="text-gray-500">Guardian Name</span>
              <span className="font-medium">
                {studentData?.guardian_name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between p-3 border rounded hover:bg-gray-50 items-center">
              <span className="text-gray-500">Contact</span>
              {isEditing ? (
                <input
                  className="border rounded px-2 py-1"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              ) : (
                <span className="font-medium">
                  {studentData?.phone_number || "N/A"}
                </span>
              )}
            </div>
            <div className="flex justify-between p-3 border rounded hover:bg-gray-50 items-center">
              <span className="text-gray-500">Guardian Contact</span>
              {isEditing ? (
                <input
                  className="border rounded px-2 py-1"
                  value={formData.guardian_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guardian_contact: e.target.value,
                    })
                  }
                />
              ) : (
                <span className="font-medium">
                  {studentData?.guardian_contact || "N/A"}
                </span>
              )}
            </div>
            <div className="flex justify-between p-3 border rounded hover:bg-gray-50 items-center">
              <span className="text-gray-500">Address</span>
              {isEditing ? (
                <input
                  className="border rounded px-2 py-1"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              ) : (
                <span className="font-medium">
                  {studentData?.address || "N/A"}
                </span>
              )}
            </div>
          </div>

          {isEditing && (
            <Button
              onClick={handleUpdateProfile}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => alert("Change password flow")}
          >
            <Key className="w-4 h-4 mr-2" /> Change Password
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { User, LogOut, Key } from "lucide-react";

export default function StudentProfile({ studentData, user }) {
  const router = useRouter();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: studentData?.phone_number || "",
    address: studentData?.address || "",
    guardian_contact: studentData?.guardian_contact || "",
    guardian_name: studentData?.guardian_name || "",
    guardian_phone: studentData?.guardian_phone || "",
    emergency_contact: studentData?.emergency_contact || "",
    dob: studentData?.dob || "",
    gender: studentData?.gender || "",
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleChangePassword = () => {
    toast.info("Password change is available in profile settings.");
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          phone_number: formData.phone_number,
          address: formData.address,
          guardian_contact: formData.guardian_contact,
          guardian_name: formData.guardian_name,
          guardian_phone: formData.guardian_phone,
          emergency_contact: formData.emergency_contact,
          dob: formData.dob || null, // Handle empty string as null
          gender: formData.gender,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      window.location.reload(); // Reload to refresh data
    } catch (error) {
      toast.error("Error updating profile: " + error.message);
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Info Header */}
            <div className="col-span-full border-b pb-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-500">
                Personal Information
              </h3>
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Gender</label>
              {isEditing ? (
                <select
                  className="w-full border rounded px-2 py-1"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p className="font-medium">{studentData?.gender || "N/A"}</p>
              )}
            </div>

            {/* DOB */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
                  }
                />
              ) : (
                <p className="font-medium">{studentData?.dob || "N/A"}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Phone Number</label>
              {isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              ) : (
                <p className="font-medium">
                  {studentData?.phone_number || "N/A"}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Address</label>
              {isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              ) : (
                <p className="font-medium">{studentData?.address || "N/A"}</p>
              )}
            </div>

            {/* Guardian Info Header */}
            <div className="col-span-full border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-semibold text-gray-500">
                Guardian & Emergency
              </h3>
            </div>

            {/* Guardian Name */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Guardian Name</label>
              {isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={formData.guardian_name}
                  onChange={(e) =>
                    setFormData({ ...formData, guardian_name: e.target.value })
                  }
                />
              ) : (
                <p className="font-medium">
                  {studentData?.guardian_name || "N/A"}
                </p>
              )}
            </div>

            {/* Guardian Phone */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Guardian Phone</label>
              {isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={formData.guardian_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, guardian_phone: e.target.value })
                  }
                />
              ) : (
                <p className="font-medium">
                  {studentData?.guardian_phone || "N/A"}
                </p>
              )}
            </div>

            {/* Guardian Contact (Alt) */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">
                Guardian Contact (Alt)
              </label>
              {isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={formData.guardian_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guardian_contact: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="font-medium">
                  {studentData?.guardian_contact || "N/A"}
                </p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Emergency Contact</label>
              {isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_contact: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="font-medium">
                  {studentData?.emergency_contact || "N/A"}
                </p>
              )}
            </div>
          </div>

          {isEditing && (
            <Button
              onClick={handleUpdateProfile}
              className="w-full bg-purple-600 hover:bg-purple-700 mt-6"
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
            onClick={handleChangePassword}
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

"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Mail, Shield, Key, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function TeacherProfile({ user, profile, teacherRecord, onChangePassword }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center p-6 bg-purple-50 rounded-lg">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
              {teacherRecord?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {teacherRecord?.full_name || "Teacher"}
            </h2>
            <p className="text-gray-500">{user?.email}</p>
            <span className="mt-2 px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-xs font-semibold">
              <Shield size={12} className="inline mr-1" />
              Authorized Teacher
            </span>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
              <User className="text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="font-medium">{teacherRecord?.full_name || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
              <Mail className="text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Email Address</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
             <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
              <Shield className="text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Designation</p>
                <p className="font-medium">{teacherRecord?.designation || "Faculty Member"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start text-left h-auto p-4"
            onClick={onChangePassword}
          >
            <Key className="mr-3 h-5 w-5 text-gray-500" />
            <div>
              <div className="font-medium">Change Password</div>
              <div className="text-xs text-gray-500">Update your security credentials</div>
            </div>
          </Button>

          <Button 
            variant="destructive" 
            className="w-full justify-start text-left h-auto p-4"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <div>
              <div className="font-medium">Sign Out</div>
              <div className="text-xs text-red-200">Log out of your account</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

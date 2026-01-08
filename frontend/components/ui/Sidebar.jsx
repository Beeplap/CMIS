"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  UserPlus,
  GraduationCap,
  LogOut,
  Menu,
  BookOpen,
  LayoutDashboard,
  UserCheck,
  School,
  X,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Calendar,
  Lock,
  User,
  HelpCircle,
  DollarSign,
  FileText,
  Bell,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";

export default function Sidebar({
  role = "student", // "admin" | "teacher" | "student"
  open,
  onOpenChange,
  collapsed = false,
  onToggleCollapsed,
  currentView = "dashboard",
  onViewChange,
  // Admin-specific callbacks
  onAddTeacher,
  onAddStudent,
  onAssignClass,
  // Teacher-specific callbacks
  onChangePassword,
}) {
  const router = useRouter();
  const [statsExpanded, setStatsExpanded] = useState(
    currentView?.startsWith("statistics") || false
  );
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Auto-expand statistics when navigating to a statistics view (admin only)
  useEffect(() => {
    if (role === "admin" && currentView?.startsWith("statistics")) {
      setStatsExpanded(true);
    }
  }, [currentView, role]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const navItemClass = (active, isAction = false) =>
    `group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
      active
        ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md"
        : isAction
        ? "bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 hover:shadow-sm"
        : "text-gray-700 hover:bg-gray-50 hover:text-purple-600"
    }`;

  // Role-specific configuration
  const roleConfig = {
    admin: {
      title: "Admin",
      subtitle: "Control Panel",
      icon: LayoutDashboard,
      mainNav: [
        { id: "dashboard", label: "Dashboard", icon: Home },
        { id: "teachers", label: "Teacher Management", icon: UserCheck },
        { id: "students", label: "Student Management", icon: School },
        { id: "subjects", label: "Class & Subject Management", icon: BookOpen },
        { id: "attendance", label: "Attendance", icon: Calendar },
        { id: "fees", label: "Fee Management", icon: DollarSign },
        { id: "reports", label: "Reports", icon: FileText },
        { id: "notices", label: "Notices", icon: Bell },
      ],
      
      hasStatistics: false,
      actions: [],
    },
    teacher: {
      title: "Teacher",
      subtitle: "Dashboard",
      icon: BookOpen,
      mainNav: [
        { id: "dashboard", label: "Dashboard", icon: Home },
        { id: "attendance", label: "Attendance", icon: Calendar },
        { id: "marks", label: "Marks & Evaluation", icon: GraduationCap },
        { id: "assignments", label: "Assignments", icon: BookOpen },
        { id: "performance", label: "Performance", icon: BarChart3 },
        { id: "notices", label: "Notices", icon: Bell },
        { id: "profile", label: "Profile & Settings", icon: User },
      ],
      hasStatistics: false,
      actions: [],
    },
    student: {
      title: "Student",
      subtitle: "Dashboard",
      icon: User,
      mainNav: [
        { id: "dashboard", label: "Overview", icon: LayoutDashboard },
        { id: "assignments", label: "Assignments", icon: BookOpen },
        { id: "attendance", label: "My Attendance", icon: Calendar },
        { id: "profile", label: "Profile", icon: User },
      ],
      hasStatistics: false,
      actions: [],
      additionalNav: [
        { id: "support", label: "Help & Support", icon: HelpCircle },
      ],
    },
  };

  const config = roleConfig[role] || roleConfig.student;
  const IconComponent = config.icon;

  const Content = (
    <div
      className={`bg-white border-r border-gray-200 ${
        collapsed ? "p-2" : "p-4"
      } h-full flex flex-col shadow-sm`}
    >
      {/* Top: Title + toggle */}
      <div className="flex items-center justify-between mb-6">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {config.title}
              </h2>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
          </div>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {open && (
          <button
            onClick={() => onOpenChange && onOpenChange(false)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition text-gray-600 hover:text-gray-900 sm:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1">
        {/* Main Navigation Section */}
        {!collapsed && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Main
            </p>
          </div>
        )}

        {/* Main Navigation Items */}
        {config.mainNav.map((item) => {
          const ItemIcon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange && onViewChange(item.id)}
              className={navItemClass(currentView === item.id)}
            >
              <ItemIcon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* Statistics (Admin only) */}
        {role === "admin" && config.hasStatistics && (
          <>
            {!collapsed ? (
              <>
                <button
                  onClick={() => setStatsExpanded(!statsExpanded)}
                  className={navItemClass(
                    currentView?.startsWith("statistics") || false
                  )}
                >
                  <BarChart3 className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-left">Statistics</span>
                  {statsExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {statsExpanded && (
                  <div className="ml-8 space-y-1">
                    <button
                      onClick={() =>
                        onViewChange && onViewChange("statistics/teachers")
                      }
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentView === "statistics/teachers"
                          ? "bg-purple-100 text-purple-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-purple-600"
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Teacher Stats</span>
                    </button>
                    <button
                      onClick={() =>
                        onViewChange && onViewChange("statistics/users")
                      }
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentView === "statistics/users"
                          ? "bg-purple-100 text-purple-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-purple-600"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>User Stats</span>
                    </button>
                    <button
                      onClick={() =>
                        onViewChange && onViewChange("statistics/students")
                      }
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentView === "statistics/students"
                          ? "bg-purple-100 text-purple-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-purple-600"
                      }`}
                    >
                      <School className="w-4 h-4" />
                      <span>Student Stats</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() =>
                  onViewChange && onViewChange("statistics/teachers")
                }
                className={navItemClass(currentView?.startsWith("statistics"))}
              >
                <BarChart3 className="w-5 h-5 shrink-0" />
              </button>
            )}
          </>
        )}

        {/* Additional Navigation (Student only) */}
        {role === "student" && config.additionalNav && (
          <>
            {config.additionalNav.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange && onViewChange(item.id)}
                  className={navItemClass(currentView === item.id)}
                >
                  <ItemIcon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* Divider */}
        {!collapsed && (config.actions.length > 0 || role === "student") && (
          <div className="my-4">
            <div className="h-px bg-gray-200"></div>
          </div>
        )}

        {/* Actions Section */}
        {config.actions.length > 0 && (
          <>
            {!collapsed && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  Actions
                </p>
              </div>
            )}

            {config.actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={navItemClass(false, true)}
                >
                  <ActionIcon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 text-left">{action.label}</span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Sign out at bottom */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Sign Out</span>}
        </button>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={signOut}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } shrink-0 hidden sm:block transition-all duration-300 overflow-hidden bg-white border-r border-gray-200`}
      >
        {Content}
      </aside>

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange && onOpenChange(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl animate-[slideIn_.3s_ease-out]">
            {Content}
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SupabaseHealthCheck() {
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple lightweight query to check connection
        // Using 'courses' table as it depends on core schema
        // HEAD request to minimize data transfer
        const { error } = await supabase
          .from("courses")
          .select("id", { count: "exact", head: true });

        if (error) {
          console.error("Supabase connection check failed:", error);
          // If we get a specific error indicating service unavailability or pausing
          // 503 is typical for paused projects, but Supabase might return other codes
          // We'll treat any significant fetch error on startup as a reason to show the message
          // specifically if it relates to connection failure.

          // However, RLS errors (401/403) mean it IS connected but denied.
          // We only want to block on 5xx or network errors.

          if (
            error.code &&
            (error.code.startsWith("5") ||
              error.message === "FetchError" ||
              error.message === "Failed to fetch")
          ) {
            setIsError(true);
          }
        }
      } catch (err) {
        console.error("Critical Supabase connection error:", err);
        setIsError(true);
      }
    };

    checkConnection();
  }, []);

  if (!isError) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-16 h-16 mx-auto text-red-500 mb-4"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900">
          Service Temporarily Unavailable
        </h1>
        <p className="text-gray-600">
          Sorry, we are encountering a server error. Please contact the
          administrator or developer.
        </p>
      </div>
    </div>
  );
}

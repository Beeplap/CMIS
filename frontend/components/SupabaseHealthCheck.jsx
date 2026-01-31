"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SupabaseHealthCheck({ children }) {
  const [isError, setIsError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log("Checking Supabase connection...");
        // Simple lightweight query to check connection
        // Using 'courses' table as it depends on core schema
        // HEAD request to minimize data transfer
        const { error } = await supabase
          .from("courses")
          .select("id", { count: "exact", head: true });

        if (error) {
          console.error("Supabase connection check failed:", error);

          // Improved Error Detection Logic
          const errorMessage = (error.message || "").toLowerCase();
          const errorString = (error.toString() || "").toLowerCase();

          // Check for common connection-related error patterns
          const isNetworkError =
            errorMessage.includes("networkerror") ||
            errorMessage.includes("failed to fetch") ||
            errorMessage.includes("upstream request timeout") ||
            errorMessage.includes("fetcherror") ||
            errorString.includes("networkerror");

          // Check for 5xx server errors (Service Unavailable, etc.)
          const isServerError = error.code && error.code.startsWith("5");

          if (isServerError || isNetworkError) {
            console.log(
              "Global Error State Triggered: Connection/Server Failure detected",
            );
            setIsError(true);
          }
        } else {
          console.log("Supabase connection healthy");
        }
      } catch (err) {
        console.error("Critical Supabase connection exception:", err);
        // Catch-all for any other critical exceptions during the fetch attempt
        setIsError(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkConnection();
  }, []);

  if (isChecking) {
    // Show a blank screen or a spinner while checking connection
    // This prevents the "flash" of the login page
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-200 p-4">
<div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-8 text-center">
{/* Icon */}
<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
className="h-8 w-8 text-red-500"
>
<circle cx="12" cy="12" r="10" />
<line x1="12" y1="8" x2="12" y2="12" />
<line x1="12" y1="16" x2="12.01" y2="16" />
</svg>
</div>


{/* Text */}
<h1 className="text-2xl font-semibold text-gray-900">
Service Temporarily Unavailable
</h1>
<p className="mt-3 text-sm leading-relaxed text-gray-600">
We're experiencing a temporary server issue. Our team is already
working on it. Please try again later or contact support if the problem
persists.
</p>


{/* Actions */}
<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
<button
onClick={() => window.location.reload()}
className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
>
Refresh Page
</button>
<a
href="mailto:ghartibeeplap@gmail.com"
className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
>
Contact Support
</a>
</div>


{/* Footer */}
<p className="mt-8 text-xs text-gray-400">
Error Code: 503 • Please excuse the inconvenience
</p>
</div>
</div>
);
  }

  return <>{children}</>;
}

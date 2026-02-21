"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";

// Password validation rules
const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "special",
    label: "At least one special character (!@#$%^&* etc.)",
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p),
  },
];

function validatePassword(password) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    registrationNumber: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        pass: rule.test(formData.password),
      })),
    [formData.password],
  );
  const isPasswordValid = useMemo(
    () => validatePassword(formData.password),
    [formData.password],
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError(
        "Password must be at least 8 characters, include one uppercase letter, and one special character.",
      );
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/student-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600 mb-2">
            Student Registration
          </h1>
          <p className="text-gray-600">
            Verify your identity to create an account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="John"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="registrationNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Registration Number
            </label>
            <input
              id="registrationNumber"
              type="text"
              required
              value={formData.registrationNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="e.g. 6-2-1055-***-2023"
            />
          </div>

          <div>
            <label
              htmlFor="dob"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              required
              value={formData.dob}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Create a new account
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordRules(true)}
                  onBlur={() => setShowPasswordRules(formData.password.length > 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 outline-none transition-all ${
                    formData.password && !isPasswordValid
                      ? "border-amber-400"
                      : formData.password && isPasswordValid
                        ? "border-green-500"
                        : ""
                  }`}
                  placeholder="Min 8 chars, 1 uppercase, 1 special (!@#$%)"
                  minLength={8}
                  autoComplete="new-password"
                />
                {(showPasswordRules || formData.password) && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Password requirements:
                    </p>
                    <ul className="space-y-1.5">
                      {passwordChecks.map(({ id, label, pass }) => (
                        <li
                          key={id}
                          className={`flex items-center gap-2 text-sm ${
                            pass
                              ? "text-green-600 dark:text-green-500"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {pass ? (
                            <Check className="w-4 h-4 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 shrink-0 opacity-50" />
                          )}
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium shadow-md"
          >
            {loading ? "Verifying & Registering..." : "Create Account"}
          </button>

          <div className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./card";
import { Dialog } from "@headlessui/react";

export default function AddUser({
  open,
  onClose,
  onUserAdded,
  defaultRole = "teacher",
}) {
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState(defaultRole);

  // Student-specific fields
  const [gender, setGender] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batches, setBatches] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");

  // Update role when defaultRole prop changes
  useEffect(() => {
    if (open) {
      setNewRole(defaultRole);
      // Reset student-specific fields when opening
      setGender("");
      setRegistrationNumber("");
      setSelectedBatchId("");
      setPhoneNumber("");
      setGuardianName("");
      setGuardianPhone("");
      setGuardianContact("");
      setAddress("");
      setDateOfBirth("");
      setAdmissionDate("");
    }
    // Fetch batches if role is student
    if (defaultRole === "student" || newRole === "student") {
      fetchBatches();
    }
  }, [defaultRole, open, newRole]);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    }
  };

  const handleAddUser = async () => {
    setAddLoading(true);
    setAddError("");
    setAddSuccess("");

    try {
      // Validate student-specific fields if role is student
      if (newRole === "student") {
        if (!gender || !selectedBatchId || !phoneNumber) {
          throw new Error(
            "Please fill all required student fields (Gender, Batch, Phone)",
          );
        }
      }

      const requestBody = {
        email: newEmail,
        password: newPassword,
        full_name: newFullName,
        role: newRole,
      };

      // Add student-specific fields
      if (newRole === "student") {
        requestBody.gender = gender;
        requestBody.reg_no = registrationNumber;
        requestBody.batch_id = selectedBatchId;
        requestBody.phone_number = phoneNumber;
        requestBody.guardian_name = guardianName;
        requestBody.guardian_phone = guardianPhone;
        requestBody.guardian_contact = guardianContact;
        requestBody.address = address;
        requestBody.date_of_birth = dateOfBirth || null;
        requestBody.admission_date = admissionDate || null;
      }

      const res = await fetch("/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add user");
      }

      setAddSuccess("User added successfully!");
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewRole("teacher");
      setGender("");
      setRegistrationNumber("");
      setSelectedBatchId("");
      setPhoneNumber("");
      setGuardianName("");
      setGuardianPhone("");
      setGuardianContact("");
      setAddress("");
      setDateOfBirth("");
      setAdmissionDate("");

      onUserAdded();

      setTimeout(() => {
        onClose();
        setAddSuccess("");
      }, 1500);
    } catch (error) {
      setAddError(error.message);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
          <Card className="shadow-none border-none">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Add New User
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm">
                  {addError}
                </div>
              )}
              {addSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm">
                  {addSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>

              {/* Student-specific fields */}
              {newRole === "student" && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Student Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Batch <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                      >
                        <option value="">Select Batch</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.course?.code}{" "}
                            {batch.course?.type === "Yearly" ? "Year" : "Sem"}{" "}
                            {batch.academic_unit}{" "}
                            {batch.section ? `- Sec ${batch.section}` : ""} (
                            {batch.admission_year})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                        placeholder="e.g. 6-2-1055-***-2023"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                        placeholder="+977 98XXXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                        placeholder="Guardian full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Guardian Phone
                      </label>
                      <input
                        type="tel"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                        placeholder="+977 98XXXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Guardian Contact (Alt.)
                      </label>
                      <input
                        type="text"
                        value={guardianContact}
                        onChange={(e) => setGuardianContact(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                        placeholder="Email or secondary number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                        placeholder="City, Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Admission Date
                      </label>
                      <input
                        type="date"
                        value={admissionDate}
                        onChange={(e) => setAdmissionDate(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 bg-white/80 dark:bg-black/20"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  setAddError("");
                  setAddSuccess("");
                }}
                disabled={addLoading}
                className="border-gray-400 text-gray-700 dark:text-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={
                  addLoading ||
                  !newEmail ||
                  !newPassword ||
                  !newFullName ||
                  (newRole === "student" &&
                    (!gender || !selectedBatchId || !phoneNumber))
                }
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
              >
                {addLoading ? "Adding..." : "Add User"}
              </Button>
            </CardFooter>
          </Card>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

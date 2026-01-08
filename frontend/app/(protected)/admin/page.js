"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/ui/Sidebar";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  School,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Bell,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AddUser from "@/components/ui/addUser"; // Existing component
import AddClass from "@/components/ui/addClass"; // Existing component
// import AddSubject from "@/components/ui/addSubject"; // Assuming this exists or we'll make a simple one inline

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");

  // Data States
  const [profiles, setProfiles] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notices, setNotices] = useState([]);
  const [fees, setFees] = useState([]);
  
  // Modal States
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserRole, setAddUserRole] = useState("student");
  const [showAddClass, setShowAddClass] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");

  // --- Auth & Initial Load ---
  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      router.replace("/login");
      return;
    }
    
    setUserRole("admin");
    setLoading(false);
    fetchAllData();
  };

  const fetchAllData = async () => {
    // Fetch Users (Admins, Teachers)
    const { data: usersData } = await supabase.from("users").select("*");
    if (usersData) {
      setProfiles(usersData);
      setTeachers(usersData.filter(u => u.role === "teacher"));
    }

    // Fetch Students
    const { data: studentsData } = await supabase.from("students").select("*");
    if (studentsData) setStudents(studentsData);

    // Fetch Classes
    const { data: classesData } = await supabase.from("classes").select("*");
    if (classesData) setClasses(classesData);

    // Fetch Subjects (Mock or API)
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const json = await res.json();
        setSubjects(json.subjects || []);
      }
    } catch (e) { console.error("Subjects fetch error", e); }

    // Fetch Notices
    const { data: noticesData } = await supabase.from("notices").select("*").order("date", { ascending: false });
    if (noticesData) setNotices(noticesData);

    // Fetch Fees
    const { data: feesData } = await supabase
      .from("fees")
      .select("*, students(full_name, class)")
      .order("created_at", { ascending: false });
    
    if (feesData) {
        // Transform for display if needed
        setFees(feesData); 
    }
  };

  // --- Handlers ---
  const handleAddUser = (role) => {
    setAddUserRole(role);
    setShowAddUser(true);
  };

  const handleDeleteUser = async (id, role) => {
    if(!confirm("Are you sure?")) return;
    try {
      // Use existing API or direct Supabase if policy allows
       await fetch("/api/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      fetchAllData(); // Refresh
    } catch (error) {
      alert("Error deleting user");
    }
  };

  const handleAddNotice = async () => {
      const title = prompt("Enter Notice Title:");
      if (!title) return;
      
      const target = prompt("Enter Target (All Students / Teachers):", "All Students");
      
      const { error } = await supabase.from("notices").insert([
          { title, target, date: new Date().toISOString().split('T')[0] }
      ]);
      
      if (error) alert("Error adding notice");
      else fetchAllData();
  };

  const handleDeleteNotice = async (id) => {
      if(!confirm("Delete this notice?")) return;
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) alert("Error deleting notice");
      else fetchAllData();
  };

  // --- Render Helpers ---

  // 1. Dashboard Component
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Students" 
          value={students.length} 
          icon={School} 
          color="text-blue-600" 
          bg="bg-blue-100" 
        />
        <StatsCard 
          title="Total Teachers" 
          value={teachers.length} 
          icon={UserCheck} 
          color="text-purple-600" 
          bg="bg-purple-100" 
        />
        <StatsCard 
          title="Classes" 
          value={classes.length} 
          icon={LayoutDashboard} 
          color="text-green-600" 
          bg="bg-green-100" 
        />
         <StatsCard 
          title="Avg Attendance" 
          value="85%" 
          icon={Clock} 
          color="text-orange-600" 
          bg="bg-orange-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Attendance Summary</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center bg-gray-50 border-dashed border-2 rounded-lg">
             <p className="text-gray-500">Attendance Chart Placeholder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fee Status Overview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="font-medium text-red-700">Pending Dues</span>
                <span className="font-bold text-red-700">$12,450</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-green-700">Collected This Month</span>
                <span className="font-bold text-green-700">$45,200</span>
             </div>
             <Button variant="outline" className="w-full" onClick={()=>setCurrentView("fees")}>View Fee Details</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 2. Students Component
  const renderStudents = () => {
    const filtered = students.filter(s => 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.roll?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Student Management</h2>
            <Button onClick={() => handleAddUser("student")} className="bg-purple-600"><Plus className="w-4 h-4 mr-2"/> Add Student</Button>
        </div>
        <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500"/>
                <Input placeholder="Search students..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
        </div>
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 uppercase text-gray-600">
                        <tr>
                            <th className="px-6 py-3">Roll</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Class</th>
                            <th className="px-6 py-3">Guardian</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => (
                            <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium">{s.roll}</td>
                                <td className="px-6 py-4">{s.full_name}</td>
                                <td className="px-6 py-4">{s.class} - {s.section}</td>
                                <td className="px-6 py-4">{s.guardian_name}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeleteUser(s.id, 'student')}><Trash2 className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="sm" title="Assign Class" onClick={() => setShowAddClass(true)}><BookOpen className="w-4 h-4 text-gray-500"/></Button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-500">No students found</td></tr>}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>
    );
  };

  // 3. Teachers Component
  const renderTeachers = () => {
     const filtered = teachers.filter(t => 
       t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       t.email?.toLowerCase().includes(searchQuery.toLowerCase())
     );
     return (
       <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold">Teacher Management</h2>
             <Button onClick={() => handleAddUser("teacher")} className="bg-purple-600"><Plus className="w-4 h-4 mr-2"/> Add Teacher</Button>
         </div>
         <div className="relative">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500"/>
             <Input placeholder="Search teachers..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
         </div>
         <div className="grid gap-6">
             <Card>
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                         <thead className="bg-gray-100 uppercase text-gray-600">
                             <tr>
                                 <th className="px-6 py-3">Name</th>
                                 <th className="px-6 py-3">Email</th>
                                 <th className="px-6 py-3">Status</th>
                                 <th className="px-6 py-3 text-right">Actions</th>
                             </tr>
                         </thead>
                         <tbody>
                             {filtered.map(t => (
                                 <tr key={t.id} className="border-b hover:bg-gray-50">
                                     <td className="px-6 py-4 font-medium">{t.full_name}</td>
                                     <td className="px-6 py-4">{t.email}</td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded-full text-xs ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                             {t.is_active ? 'Active' : 'Inactive'}
                                         </span>
                                     </td>
                                     <td className="px-6 py-4 text-right space-x-2">
                                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4"/></Button>
                                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={()=>handleDeleteUser(t.id, 'teacher')}><Trash2 className="w-4 h-4"/></Button>
                                     </td>
                                 </tr>
                             ))}
                             {filtered.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-gray-500">No teachers found</td></tr>}
                         </tbody>
                     </table>
                 </div>
             </Card>
         </div>
       </div>
     )
  }

  // 4. Class & Subjects Component
  const renderClasses = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold">Class & Subject Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Classes</CardTitle>
                    <Button size="sm" onClick={() => setShowAddClass(true)}><Plus className="w-4 h-4 mr-2"/> Add</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    {classes.map(c => (
                        <div key={c.id} className="flex justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p className="font-semibold">{c.course} {c.course === 'BCA' ? 'Sem' : 'Year'}-{c.semester} {c.section && `(${c.section})`}</p>
                                <p className="text-xs text-gray-500">{c.subject}</p>
                            </div>
                        </div>
                    ))}
                    {classes.length === 0 && <p className="text-center text-gray-500 py-4">No classes added</p>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Subjects</CardTitle>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add</Button>
                </CardHeader>
                 <CardContent className="space-y-2">
                    {subjects.map(s => (
                        <div key={s.id} className="flex justify-between p-3 bg-gray-50 rounded">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border">{s.code}</span>
                        </div>
                    ))}
                     {subjects.length === 0 && <p className="text-center text-gray-500 py-4">No subjects added</p>}
                </CardContent>
            </Card>
        </div>
    </div>
  );

  // 5. Attendance Component
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAttendance = async (classId, date) => {
      if (!classId) return;
      setLoading(true);
      // Assuming attendance table has: class_id, date, status, student_id (FK), etc.
      // Adjust structure based on actual table. Using a generic guess based on previous files.
      const { data, error } = await supabase
        .from("attendance")
        .select(`
            *,
            students:student_id (full_name, roll)
        `)
        .eq("class_id", classId) // Adjust if column name is different
        .eq("date", date);
      
      if (data) setAttendanceRecords(data);
      if (error) {
          // Fallback if class_id is not the column, maybe it's linked via subject?
          // For now, assuming direct link or we just show a message.
          console.error("Attendance fetch error", error);
      }
      setLoading(false);
  };

  const renderAttendance = () => (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold">Attendance Monitoring</h2>
          <div className="flex gap-4">
              <select 
                className="border p-2 rounded-md w-40"
                value={selectedAttendanceClass}
                onChange={(e) => {
                    setSelectedAttendanceClass(e.target.value);
                    fetchAttendance(e.target.value, attendanceDate);
                }}
              >
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.course}</option>)}
              </select>
              <input 
                type="date" 
                className="border p-2 rounded-md"
                value={attendanceDate}
                onChange={(e) => {
                    setAttendanceDate(e.target.value);
                    if(selectedAttendanceClass) fetchAttendance(selectedAttendanceClass, e.target.value);
                }}
              />
              <Button onClick={() => fetchAttendance(selectedAttendanceClass, attendanceDate)}>Refresh</Button>
          </div>
          <Card>
              <CardContent className="p-0">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 uppercase text-gray-600">
                          <tr>
                             <th className="px-6 py-3">Roll</th>
                             <th className="px-6 py-3">Student</th>
                             <th className="px-6 py-3">Status</th>
                             <th className="px-6 py-3">Date</th>
                          </tr>
                      </thead>
                      <tbody>
                          {attendanceRecords.length > 0 ? (
                              attendanceRecords.map(record => (
                                  <tr key={record.id} className="border-b">
                                      <td className="px-6 py-4">{record.students?.roll}</td>
                                      <td className="px-6 py-4">{record.students?.full_name}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                              record.status === 'Present' ? 'bg-green-100 text-green-700' : 
                                              record.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                              {record.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">{record.date}</td>
                                  </tr>
                              ))
                          ) : (
                             <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                 {selectedAttendanceClass ? "No records found for this date." : "Select a class to view attendance records"}
                             </td></tr>
                          )}
                      </tbody>
                  </table>
              </CardContent>
          </Card>
          
          <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2 text-red-600">Low Attendance Alert (&lt;75%)</h3>
              <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                      <p className="text-sm text-red-700">No students currently flagged for low attendance.</p>
                  </CardContent>
              </Card>
          </div>
      </div>
  );
  
  // 6. Fees Component
  const renderFees = () => (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold">Fee Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
               <Card className="bg-green-50 border-green-200"><CardContent className="p-4 text-center"><p className="text-sm text-green-600">Collected</p><p className="text-2xl font-bold text-green-800">$45,200</p></CardContent></Card>
               <Card className="bg-red-50 border-red-200"><CardContent className="p-4 text-center"><p className="text-sm text-red-600">Pending</p><p className="text-2xl font-bold text-red-800">$12,450</p></CardContent></Card>
          </div>
          <Card>
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 uppercase text-gray-600">
                      <tr>
                          <th className="px-6 py-3">Student</th>
                          <th className="px-6 py-3">Class</th>
                          <th className="px-6 py-3">Amount Due</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {fees.map(fee => (
                          <tr key={fee.id} className="border-b">
                              <td className="px-6 py-4 font-medium">{fee.students?.full_name || "Unknown"}</td>
                              <td className="px-6 py-4">{fee.students?.class || "N/A"}</td>
                              <td className="px-6 py-4">${fee.amount}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                      fee.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                      fee.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                      {fee.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4"><Button size="sm" variant="outline">Remind</Button></td>
                          </tr>
                      ))}
                      {fees.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-gray-500">No fee records found</td></tr>}
                  </tbody>
              </table>
              </div>
          </Card>
      </div>
  );

  // 7. Reports Component
  const renderReports = () => (
       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold">Reports & Exports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                  <CardHeader><CardTitle>Attendance Report</CardTitle></CardHeader>
                  <CardContent>
                      <p className="text-sm text-gray-500 mb-4">Monthly attendance summary for all classes.</p>
                      <div className="flex gap-2">
                        <Button variant="outline"><FileText className="w-4 h-4 mr-2"/> PDF</Button>
                        <Button variant="outline"><FileText className="w-4 h-4 mr-2"/> Excel</Button>
                      </div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader><CardTitle>Student Performance</CardTitle></CardHeader>
                  <CardContent>
                      <p className="text-sm text-gray-500 mb-4">Academic performance and grades export.</p>
                       <div className="flex gap-2">
                        <Button variant="outline"><FileText className="w-4 h-4 mr-2"/> PDF</Button>
                        <Button variant="outline"><FileText className="w-4 h-4 mr-2"/> Excel</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
       </div>
  );

  // 8. Notices Component
  const renderNotices = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold">Notices & Announcements</h2>
             <Button className="bg-purple-600" onClick={handleAddNotice}><Plus className="w-4 h-4 mr-2"/> Create Notice</Button>
         </div>
         <Card>
             <CardContent className="p-0">
                 {notices.map(n => (
                     <div key={n.id} className="p-4 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center">
                         <div>
                             <h4 className="font-semibold text-gray-900">{n.title}</h4>
                             <p className="text-sm text-gray-500">Target: {n.target} • {n.date}</p>
                         </div>
                         <Button variant="ghost" size="sm" onClick={() => handleDeleteNotice(n.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                     </div>
                 ))}
             </CardContent>
         </Card>
      </div>
  );

  // --- Main Render ---
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="admin"
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentView={currentView}
        onViewChange={setCurrentView}
        onAddStudent={()=>{setAddUserRole("student"); setShowAddUser(true);}}
        onAddTeacher={()=>{setAddUserRole("teacher"); setShowAddUser(true);}}
        onAssignClass={()=>{setShowAddClass(true)}}
      />
      
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
        {/* Header Mobile Toggle */}
        <div className="md:hidden flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-purple-700">Admin Panel</h1>
            <Button variant="ghost" onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6"/></Button>
        </div>

        {/* Content Switcher */}
        {currentView === "dashboard" && renderDashboard()}
        {currentView === "students" && renderStudents()}
        {currentView === "teachers" && renderTeachers()}
        {currentView === "subjects" && renderClasses()} 
        {/* Note: Sidebar uses 'subjects' ID for Class & Subject Management */}
        {currentView === "attendance" && renderAttendance()}
        {currentView === "fees" && renderFees()}
        {currentView === "reports" && renderReports()}
        {currentView === "notices" && renderNotices()}
      </main>

      {/* Modals */}
      {/* Modals */}
      <AddUser 
        open={showAddUser} 
        onClose={() => setShowAddUser(false)} 
        onUserAdded={fetchAllData}
        defaultRole={addUserRole} 
      />

      {showAddClass && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">Assign Class</h3>
                    <Button variant="ghost" onClick={() => setShowAddClass(false)}><XCircle className="w-5 h-5"/></Button>
                </div>
                <div className="p-4">
                    <AddClass onClose={() => {setShowAddClass(false); fetchAllData();}} />
                </div>
            </div>
           </div>
      )}
    </div>
  );
}

// Simple Stat Card Component
function StatsCard({ title, value, icon: Icon, color, bg }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

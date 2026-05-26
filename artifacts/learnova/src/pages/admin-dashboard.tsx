import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  Activity, LogOut, GraduationCap, Shield,
  CheckCircle2, XCircle, RefreshCw, Trash2,
  ToggleLeft, ToggleRight, ChevronRight, Loader2,
  AlertTriangle, Eye, EyeOff, Pencil, UserCheck,
  UserX, Clock, TrendingUp
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  totalStudents: number;
  totalTeachers: number;
  pendingStudentRequests: number;
  pendingTeacherRequests: number;
  recentActivity: ActivityLog[];
}

interface StudentRequest {
  id: number;
  fullName: string;
  grade: string;
  religion: string;
  parentContact: string | null;
  status: string;
  createdAt: string;
}

interface TeacherRequest {
  id: number;
  fullName: string;
  subject: string;
  email: string | null;
  status: string;
  createdAt: string;
}

interface Student {
  id: number;
  fullName: string;
  studentCode: string;
  grade: number;
  religion: string;
  isActive: boolean;
  createdAt: string;
}

interface Teacher {
  id: number;
  fullName: string;
  subject: string;
  email: string | null;
  status: string;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  userId: number | null;
  userRole: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",          label: "Overview",           icon: LayoutDashboard },
  { id: "student-requests",  label: "Student Requests",   icon: GraduationCap },
  { id: "teacher-requests",  label: "Teacher Requests",   icon: BookOpen },
  { id: "students",          label: "Students",           icon: Users },
  { id: "teachers",          label: "Teachers",           icon: UserCheck },
  { id: "activity-logs",     label: "Activity Logs",      icon: Activity },
];

function statusBadge(status: string) {
  if (status === "pending")  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
  if (status === "disabled") return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Disabled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["admin", "overview"],
    queryFn: () => apiFetch("/api/admin/overview"),
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingState />;

  const stats = [
    { label: "Total Students", value: data?.totalStudents ?? 0, icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
    { label: "Active Teachers", value: data?.totalTeachers ?? 0, icon: BookOpen, color: "text-purple-600 bg-purple-50" },
    { label: "Pending Students", value: data?.pendingStudentRequests ?? 0, icon: ClipboardList, color: "text-amber-600 bg-amber-50" },
    { label: "Pending Teachers", value: data?.pendingTeacherRequests ?? 0, icon: Clock, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Dashboard Overview</h2>
        <p className="text-muted-foreground text-sm">System status at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl p-5">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold mb-1">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-base font-semibold mb-4">Recent Activity</h3>
        {data?.recentActivity.length === 0 ? (
          <EmptyState message="No activity yet" />
        ) : (
          <div className="space-y-2">
            {data?.recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 bg-card border border-card-border rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.details}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.userName} · {fmt(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Student Requests Tab ─────────────────────────────────────────────────────

function StudentRequestsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [approvedInfo, setApprovedInfo] = useState<{ code: string; pass: string } | null>(null);

  const { data = [], isLoading } = useQuery<StudentRequest[]>({
    queryKey: ["admin", "student-requests"],
    queryFn: () => apiFetch("/api/admin/student-requests"),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/student-requests/${id}/approve`, { method: "POST" }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      setApprovedInfo({ code: res.studentCode, pass: res.tempPassword });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/student-requests/${id}/reject`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast({ title: "Rejected" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingState />;

  const pending = data.filter((r) => r.status === "pending");
  const processed = data.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <SectionHeader title="Student Enrollment Requests" count={pending.length} label="pending" />

      {approvedInfo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
            <CheckCircle2 className="w-5 h-5" /> Student Approved!
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Student Code</p>
              <p className="font-mono font-bold text-lg">{approvedInfo.code}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Temp Password</p>
              <p className="font-mono font-bold text-lg">{approvedInfo.pass}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Share these credentials with the student. They can change their password after signing in.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setApprovedInfo(null)}>Dismiss</Button>
        </div>
      )}

      {pending.length === 0 ? (
        <EmptyState message="No pending requests" icon={<CheckCircle2 className="w-8 h-8 text-green-500" />} />
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <RequestCard
              key={r.id}
              name={r.fullName}
              meta={`Grade ${r.grade} · ${r.religion}${r.parentContact ? ` · ${r.parentContact}` : ""}`}
              date={r.createdAt}
              onApprove={() => approveMut.mutate(r.id)}
              onReject={() => rejectMut.mutate(r.id)}
              loading={approveMut.isPending || rejectMut.isPending}
            />
          ))}
        </div>
      )}

      {processed.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-muted-foreground">Processed</h3>
          <div className="space-y-2">
            {processed.map((r) => (
              <div key={r.id} className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4">
                <div className="flex-1">
                  <p className="font-medium">{r.fullName}</p>
                  <p className="text-sm text-muted-foreground">Grade {r.grade} · {r.religion} · {fmt(r.createdAt)}</p>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Teacher Requests Tab ─────────────────────────────────────────────────────

function TeacherRequestsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [approveId, setApproveId] = useState<number | null>(null);
  const [subjectPassword, setSubjectPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { data = [], isLoading } = useQuery<TeacherRequest[]>({
    queryKey: ["admin", "teacher-requests"],
    queryFn: () => apiFetch("/api/admin/teacher-requests"),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      apiFetch(`/api/admin/teacher-requests/${id}/approve`, { method: "POST", body: JSON.stringify({ subjectPassword: password }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      setApproveId(null);
      setSubjectPassword("");
      toast({ title: "Teacher approved successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/teacher-requests/${id}/reject`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast({ title: "Rejected" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingState />;

  const pending = data.filter((r) => r.status === "pending");
  const processed = data.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <SectionHeader title="Teacher Access Requests" count={pending.length} label="pending" />

      {pending.length === 0 ? (
        <EmptyState message="No pending teacher requests" icon={<CheckCircle2 className="w-8 h-8 text-green-500" />} />
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{r.fullName}</p>
                  <p className="text-sm text-muted-foreground">{r.subject}{r.email ? ` · ${r.email}` : ""} · {fmt(r.createdAt)}</p>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => setApproveId(r.id)} className="gap-1.5 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectMut.mutate(r.id)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {processed.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-muted-foreground">Processed</h3>
          <div className="space-y-2">
            {processed.map((r) => (
              <div key={r.id} className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4">
                <div className="flex-1">
                  <p className="font-medium">{r.fullName}</p>
                  <p className="text-sm text-muted-foreground">{r.subject}{r.email ? ` · ${r.email}` : ""} · {fmt(r.createdAt)}</p>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Approve dialog with password */}
      <Dialog open={approveId !== null} onOpenChange={(o) => !o && setApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Teacher Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set the subject login password for this teacher. They'll use this to sign in along with their name and subject.
          </p>
          <div className="relative mt-2">
            <Input
              type={showPass ? "text" : "password"}
              placeholder="Enter a strong password…"
              value={subjectPassword}
              onChange={(e) => setSubjectPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!subjectPassword.trim() || approveMut.isPending}
              onClick={() => approveId && approveMut.mutate({ id: approveId, password: subjectPassword })}
            >
              {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Approve & Set Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Students Management Tab ──────────────────────────────────────────────────

function StudentsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editGradeId, setEditGradeId] = useState<number | null>(null);
  const [newGrade, setNewGrade] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery<Student[]>({
    queryKey: ["admin", "students"],
    queryFn: () => apiFetch("/api/admin/students"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/students/${id}/toggle-active`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "students"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/students/${id}/reset-password`, { method: "PATCH" }),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ["admin", "students"] }); toast({ title: `Password reset to: ${r.tempPassword}` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const gradeMut = useMutation({
    mutationFn: ({ id, grade }: { id: number; grade: string }) =>
      apiFetch(`/api/admin/students/${id}/grade`, { method: "PATCH", body: JSON.stringify({ grade }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "students"] }); setEditGradeId(null); toast({ title: "Grade updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/students/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "students"] }); setDeleteId(null); toast({ title: "Student deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = data.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Students" count={data.length} label="total" />

      <Input
        placeholder="Search by name or code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? <EmptyState message="No students found" /> : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{s.fullName}</p>
                    <Badge variant="outline" className="font-mono text-xs">{s.studentCode}</Badge>
                    {s.isActive
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Active</Badge>
                      : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Disabled</Badge>
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Grade {s.grade} · {s.religion} · Joined {fmt(s.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditGradeId(s.id); setNewGrade(String(s.grade)); }} className="gap-1.5 text-xs h-8">
                    <Pencil className="w-3.5 h-3.5" /> Grade
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resetMut.mutate(s.id)} className="gap-1.5 text-xs h-8" disabled={resetMut.isPending}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Password
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => toggleMut.mutate(s.id)}
                    className={cn("gap-1.5 text-xs h-8", s.isActive ? "text-orange-600 border-orange-300 hover:bg-orange-50" : "text-green-600 border-green-300 hover:bg-green-50")}
                    disabled={toggleMut.isPending}
                  >
                    {s.isActive ? <><ToggleRight className="w-3.5 h-3.5" /> Disable</> : <><ToggleLeft className="w-3.5 h-3.5" /> Enable</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteId(s.id)} className="gap-1.5 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit grade dialog */}
      <Dialog open={editGradeId !== null} onOpenChange={(o) => !o && setEditGradeId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Grade</DialogTitle></DialogHeader>
          <Input type="number" min={1} max={12} value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="New grade (1–12)" />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditGradeId(null)}>Cancel</Button>
            <Button
              disabled={!newGrade || gradeMut.isPending}
              onClick={() => editGradeId && gradeMut.mutate({ id: editGradeId, grade: newGrade })}
            >
              {gradeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Delete Student</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action is permanent. All of this student's data will be removed.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteId && deleteMut.mutate(deleteId)}>
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Teachers Management Tab ──────────────────────────────────────────────────

function TeachersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editSubjectId, setEditSubjectId] = useState<number | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["admin", "teachers"],
    queryFn: () => apiFetch("/api/admin/teachers"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/teachers/${id}/toggle-active`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teachers"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const subjectMut = useMutation({
    mutationFn: ({ id, subject }: { id: number; subject: string }) =>
      apiFetch(`/api/admin/teachers/${id}/subject`, { method: "PATCH", body: JSON.stringify({ subject }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "teachers"] }); setEditSubjectId(null); toast({ title: "Subject updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/teachers/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "teachers"] }); setDeleteId(null); toast({ title: "Teacher removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Active Teachers" count={data.length} label="total" />

      {data.length === 0 ? <EmptyState message="No active teachers. Approve teacher requests to add them." /> : (
        <div className="space-y-2">
          {data.map((t) => (
            <div key={t.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{t.fullName}</p>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{t.subject}</Badge>
                    {t.status === "approved"
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Active</Badge>
                      : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Disabled</Badge>
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.email || "No email"} · Approved {fmt(t.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditSubjectId(t.id); setNewSubject(t.subject); }} className="gap-1.5 text-xs h-8">
                    <Pencil className="w-3.5 h-3.5" /> Subject
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => toggleMut.mutate(t.id)}
                    className={cn("gap-1.5 text-xs h-8", t.status === "approved" ? "text-orange-600 border-orange-300 hover:bg-orange-50" : "text-green-600 border-green-300 hover:bg-green-50")}
                    disabled={toggleMut.isPending}
                  >
                    {t.status === "approved" ? <><UserX className="w-3.5 h-3.5" /> Disable</> : <><UserCheck className="w-3.5 h-3.5" /> Enable</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteId(t.id)} className="gap-1.5 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editSubjectId !== null} onOpenChange={(o) => !o && setEditSubjectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Subject</DialogTitle></DialogHeader>
          <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject name…" />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditSubjectId(null)}>Cancel</Button>
            <Button disabled={!newSubject.trim() || subjectMut.isPending} onClick={() => editSubjectId && subjectMut.mutate({ id: editSubjectId, subject: newSubject })}>
              {subjectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Remove Teacher</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the teacher's access. They can re-apply with a new request.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteId && deleteMut.mutate(deleteId)}>
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Activity Logs Tab ────────────────────────────────────────────────────────

function ActivityLogsTab() {
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["admin", "activity-logs"],
    queryFn: () => apiFetch("/api/admin/activity-logs"),
    refetchInterval: 30000,
  });

  const filtered = data.filter((l) =>
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.userName.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = (action: string) => {
    if (action.includes("login")) return "bg-blue-100 text-blue-700";
    if (action.includes("approve")) return "bg-green-100 text-green-700";
    if (action.includes("reject") || action.includes("disable") || action.includes("delete")) return "bg-red-100 text-red-700";
    if (action.includes("reset") || action.includes("change") || action.includes("enable")) return "bg-amber-100 text-amber-700";
    return "bg-secondary text-secondary-foreground";
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Activity Logs" count={data.length} label="total" />
      <Input
        placeholder="Search logs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {filtered.length === 0 ? <EmptyState message="No logs found" /> : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id} className="flex items-start gap-3 bg-card border border-card-border rounded-xl p-4">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5", actionColor(log.action))}>
                {log.action.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{log.details}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.userName} ({log.userRole}) · {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      {icon ?? <ClipboardList className="w-8 h-8" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

function SectionHeader({ title, count, label }: { title: string; count: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{count} {label}</p>
      </div>
    </div>
  );
}

function RequestCard({ name, meta, date, onApprove, onReject, loading }: {
  name: string; meta: string; date: string; onApprove: () => void; onReject: () => void; loading: boolean;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{meta} · {fmt(date)}</p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} disabled={loading} className="gap-1.5 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={loading} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
          <XCircle className="w-4 h-4" /> Reject
        </Button>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, user } = useAuth();
  const { data: overview } = useQuery<OverviewData>({
    queryKey: ["admin", "overview"],
    queryFn: () => apiFetch("/api/admin/overview"),
    refetchInterval: 30000,
  });

  const tabContent: Record<string, React.ReactNode> = {
    "overview":          <OverviewTab />,
    "student-requests":  <StudentRequestsTab />,
    "teacher-requests":  <TeacherRequestsTab />,
    "students":          <StudentsTab />,
    "teachers":          <TeachersTab />,
    "activity-logs":     <ActivityLogsTab />,
  };

  const badges: Record<string, number | undefined> = {
    "student-requests": overview?.pendingStudentRequests,
    "teacher-requests": overview?.pendingTeacherRequests,
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-border bg-background transition-all duration-200",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[72px]">
          <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center text-white font-bold flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">Admin Panel</p>
              <p className="text-xs text-muted-foreground truncate">{user?.fullName}</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn("ml-auto text-muted-foreground hover:text-foreground", !sidebarOpen && "hidden")}
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((tab) => {
            const badge = badges[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{tab.label}</span>
                    {badge ? (
                      <span className="w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-bold">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {tabContent[activeTab]}
        </div>
      </main>
    </div>
  );
}

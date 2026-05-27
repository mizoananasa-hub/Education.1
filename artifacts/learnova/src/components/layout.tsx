import { useAuth } from "@/components/auth-provider";
import { TeacherProvider, useTeacher } from "@/components/teacher-context";
import { Link, useLocation } from "wouter";
import {
  LogOut, Menu, User, BookOpen, Star, FileText, Users,
  Sparkles, BookText, Layers, Settings, Bell, ClipboardList,
  ChevronDown, Check, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  role: "student" | "teacher";
}

function TeacherTopbar() {
  const { currentSubject, currentGrade, setCurrentSubject, setCurrentGrade, subjects, grades } = useTeacher();

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-card/95 backdrop-blur border-b border-border">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:block">
        Viewing:
      </span>

      {/* Subject dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
              "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[140px] truncate">{currentSubject || "No Subject"}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Assigned Subjects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {subjects.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              No subjects assigned yet
            </DropdownMenuItem>
          ) : (
            subjects.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setCurrentSubject(s)}
                className="gap-2 cursor-pointer"
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border transition-colors shrink-0",
                  currentSubject === s ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {currentSubject === s && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </span>
                {s}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Grade dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
              "bg-violet-500/5 border-violet-400/20 text-violet-700 dark:text-violet-400",
              "hover:bg-violet-500/10 hover:border-violet-400/40",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30",
            )}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>{currentGrade === "All" ? "All Grades" : currentGrade}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-violet-400/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Assigned Grades</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {grades.length > 0 && (
            <DropdownMenuItem
              onClick={() => setCurrentGrade("All")}
              className="gap-2 cursor-pointer"
            >
              <span className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border transition-colors shrink-0",
                currentGrade === "All" ? "border-violet-600 bg-violet-600" : "border-muted-foreground/30"
              )}>
                {currentGrade === "All" && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              All Grades
            </DropdownMenuItem>
          )}
          {grades.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              No grades assigned yet
            </DropdownMenuItem>
          ) : (
            grades.map((g) => (
              <DropdownMenuItem
                key={g}
                onClick={() => setCurrentGrade(g)}
                className="gap-2 cursor-pointer"
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border transition-colors shrink-0",
                  currentGrade === g ? "border-violet-600 bg-violet-600" : "border-muted-foreground/30"
                )}>
                  {currentGrade === g && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                {g}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function LayoutInner({ children, role }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const onPopState = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!user) return null;

  const teacherNav = [
    { name: "Files", href: "/teacher/files", icon: FileText },
    { name: "Students", href: "/teacher/students", icon: Users },
    { name: "Homework", href: "/teacher/homework", icon: ClipboardList },
    { name: "Ratings", href: "/teacher/ratings", icon: Star },
    { name: "Notifications", href: "/teacher/notifications", icon: Bell },
    { name: "Settings", href: "/teacher/settings", icon: Settings },
  ];

  const subjectMatch = location.match(/^\/student\/subjects\/([^?#]+)/);
  const currentSubjectPath = subjectMatch
    ? `/student/subjects/${subjectMatch[1]}`
    : null;

  const studentNav = [
    {
      name: "Subjects",
      href: "/student",
      icon: BookOpen,
      active: location === "/student" || (!!subjectMatch && !search),
    },
    {
      name: "Homework",
      href: "/student/homework",
      icon: ClipboardList,
      active: location.startsWith("/student/homework"),
    },
    {
      name: "Reviews",
      href: "/student/reviews",
      icon: Star,
      active: location === "/student/reviews",
    },
    {
      name: "Summarizing",
      href: currentSubjectPath ? `${currentSubjectPath}?tab=summarize` : "/student",
      icon: Sparkles,
      active: !!currentSubjectPath && search === "?tab=summarize",
    },
    {
      name: "Notes",
      href: currentSubjectPath ? `${currentSubjectPath}?tab=notes` : "/student",
      icon: BookText,
      active: !!currentSubjectPath && search === "?tab=notes",
    },
    {
      name: "Flash Cards",
      href: currentSubjectPath ? `${currentSubjectPath}?tab=flashcards` : "/student",
      icon: Layers,
      active: !!currentSubjectPath && search === "?tab=flashcards",
    },
    {
      name: "Notifications",
      href: "/student/notifications",
      icon: Bell,
      active: location === "/student/notifications",
    },
    {
      name: "Settings",
      href: "/student/settings",
      icon: Settings,
      active: location === "/student/settings",
    },
  ];

  const navItems =
    role === "teacher"
      ? teacherNav.map((item) => ({
          ...item,
          active: location.startsWith(item.href),
        }))
      : studentNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold shadow-sm">
            L
          </div>
          <span className="font-semibold text-xl tracking-tight">Learnova</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform duration-200",
                    item.active ? "text-primary" : "group-hover:scale-110",
                  )}
                />
                <span className="flex-1">{item.name}</span>
                {item.active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </span>
            </Link>
          ))}
        </nav>

        {role === "student" && currentSubjectPath && (
          <div className="mt-6 px-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Active Subject
            </p>
            <div className="px-3 py-2 text-sm font-medium text-sidebar-foreground bg-sidebar-accent/30 rounded-md truncate">
              {decodeURIComponent(currentSubjectPath.split("/").pop() || "")}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-3 rounded-md bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col">
        <SidebarContent />
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <DialogTitle className="sr-only">Navigation Menu</DialogTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
              L
            </div>
            <span className="font-semibold text-lg tracking-tight">Learnova</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        {role === "teacher" && <TeacherTopbar />}

        <div className="flex-1 overflow-auto bg-muted/20">
          <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function Layout({ children, role }: LayoutProps) {
  if (role === "teacher") {
    return (
      <TeacherProvider>
        <LayoutInner role={role}>{children}</LayoutInner>
      </TeacherProvider>
    );
  }
  return <LayoutInner role={role}>{children}</LayoutInner>;
}

import { useAuth } from "@/components/auth-provider";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, User, BookOpen, Users, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SelectTrigger, SelectValue } from "@/components/ui/sheet";
import { DialogTitle } from "@/components/ui/dialog"; // Ensure accessibility
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  role: "student" | "teacher";
}

export function Layout({ children, role }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const teacherNav = [
    { name: "Files", href: "/teacher/files", icon: FileText },
    { name: "Students", href: "/teacher/students", icon: Users },
    { name: "Ratings", href: "/teacher/ratings", icon: Star },
  ];

  const studentNav = [
    { name: "Dashboard", href: "/student", icon: BookOpen },
    { name: "All Reviews", href: "/student/reviews", icon: Star },
  ];

  const navItems = role === "teacher" ? teacherNav : studentNav;

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
      
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === item.href || (location.startsWith(item.href) && item.href !== "/student" && item.href !== "/teacher")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {role === "student" && location.startsWith("/student/subjects/") && (
          <div className="mt-8">
            <h4 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Current Subject
            </h4>
            <div className="px-3 py-2 text-sm font-medium text-sidebar-foreground bg-sidebar-accent/30 rounded-md">
              {decodeURIComponent(location.split("/").pop() || "")}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-4 rounded-md bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
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

        <div className="flex-1 overflow-auto bg-muted/20">
          <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

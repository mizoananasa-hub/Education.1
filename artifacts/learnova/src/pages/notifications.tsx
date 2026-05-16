import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Bell, BellOff, BookOpen, ClipboardList, FileText, Star,
  Sparkles, CheckCheck, Loader2, Award
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getToken() { return localStorage.getItem("learnova_auth_token"); }
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  new_homework: { icon: ClipboardList, color: "text-blue-500", label: "New Homework" },
  homework_graded: { icon: Award, color: "text-green-500", label: "Homework Graded" },
  new_file: { icon: FileText, color: "text-purple-500", label: "New File" },
  new_rating: { icon: Star, color: "text-yellow-500", label: "New Rating" },
  submission_received: { icon: ClipboardList, color: "text-teal-500", label: "Submission" },
  manual_grading_required: { icon: BookOpen, color: "text-orange-500", label: "Needs Grading" },
};

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await apiFetch("/api/notifications");
      setNotifications(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast({ title: "All notifications marked as read" });
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  };

  const handleClick = async (n: any) => {
    if (!n.isRead) await markRead(n.id);

    if (!n.relatedId) return;
    const role = user?.role;
    if (n.type === "new_homework" || n.type === "homework_graded") {
      setLocation(role === "student" ? "/student/homework" : "/teacher/homework");
    } else if (n.type === "submission_received" || n.type === "manual_grading_required") {
      setLocation("/teacher/homework");
    } else if (n.type === "new_file") {
      setLocation(role === "student" ? "/student" : "/teacher/files");
    } else if (n.type === "new_rating") {
      setLocation(role === "student" ? "/student/reviews" : "/teacher/ratings");
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <Badge className="text-sm px-2.5 py-0.5 bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <BellOff className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, color: "text-muted-foreground", label: n.type };
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                  n.isRead
                    ? "bg-card border-card-border opacity-70 hover:opacity-100 hover:bg-muted/30"
                    : "bg-card border-primary/20 shadow-sm hover:shadow-md",
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  n.isRead ? "bg-muted" : "bg-primary/10"
                )}>
                  <Icon className={cn("w-5 h-5", n.isRead ? "text-muted-foreground" : cfg.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={cn("text-sm font-semibold", !n.isRead && "text-foreground")}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <Badge variant="outline" className="text-xs shrink-0 self-center">
                  {cfg.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
